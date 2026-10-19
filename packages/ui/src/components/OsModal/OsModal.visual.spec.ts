import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=components-osmodal'
const STORY_ROOT = '#storybook-root'

async function waitForReady(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsModal keyboard accessibility', () => {
  test('close button is focusable via Tab', async ({ page }) => {
    await page.goto(`${STORY_URL}--default-size&viewMode=story`)
    const modal = page.locator('.os-modal')
    await modal.waitFor()

    const closeBtn = page.locator('[data-testid="os-modal-close"]')
    await expect(closeBtn).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(closeBtn).toBeFocused()
  })

  test('footer buttons are focusable via Tab', async ({ page }) => {
    await page.goto(`${STORY_URL}--default-size&viewMode=story`)
    const modal = page.locator('.os-modal')
    await modal.waitFor()

    const cancelBtn = page.locator('[data-testid="os-modal-cancel"]')
    const confirmBtn = page.locator('[data-testid="os-modal-confirm"]')
    await expect(cancelBtn).toBeVisible()
    await expect(confirmBtn).toBeVisible()

    // Tab through to find the buttons
    await page.keyboard.press('Tab') // close button
    await page.keyboard.press('Tab') // content area
    await page.keyboard.press('Tab') // cancel
    await expect(cancelBtn).toBeFocused()
    await page.keyboard.press('Tab') // confirm
    await expect(confirmBtn).toBeFocused()
  })

  test('focus moves to the panel on open', async ({ page }) => {
    await page.goto(`${STORY_URL}--default-size&viewMode=story`)
    const panel = page.locator('[data-testid="os-modal-panel"]')
    await panel.waitFor()

    await expect(panel).toBeFocused()
  })

  test('Tab and Shift+Tab stay inside the dialog', async ({ page }) => {
    await page.goto(`${STORY_URL}--default-size&viewMode=story`)
    const panel = page.locator('[data-testid="os-modal-panel"]')
    await expect(panel).toBeFocused()

    const closeBtn = page.locator('[data-testid="os-modal-close"]')
    const confirmBtn = page.locator('[data-testid="os-modal-confirm"]')

    // Shift+Tab from the panel wraps to the last element instead of leaving the dialog
    await page.keyboard.press('Shift+Tab')
    await expect(confirmBtn).toBeFocused()
    // Tab from the last element wraps to the first
    await page.keyboard.press('Tab')
    await expect(closeBtn).toBeFocused()
    // Shift+Tab from the first element wraps to the last
    await page.keyboard.press('Shift+Tab')
    await expect(confirmBtn).toBeFocused()
  })

  test('Escape closes the dialog and returns focus to the trigger', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-trigger&viewMode=story`)
    const trigger = page.locator('[data-testid="open-modal"]')
    await trigger.waitFor()

    await page.keyboard.press('Tab')
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Enter')

    const panel = page.locator('[data-testid="os-modal-panel"]')
    await expect(panel).toBeFocused()
    await checkA11y(page)

    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('the close button returns focus to the trigger', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-trigger&viewMode=story`)
    const trigger = page.locator('[data-testid="open-modal"]')
    await trigger.click()

    const closeBtn = page.locator('[data-testid="os-modal-close"]')
    await expect(closeBtn).toHaveAccessibleName('Close')
    await page.keyboard.press('Tab')
    await expect(closeBtn).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page.locator('[data-testid="os-modal-panel"]')).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
})

test.describe('OsModal visual regression', () => {
  test('default size', async ({ page }) => {
    await page.goto(`${STORY_URL}--default-size&viewMode=story`)
    const panel = page.locator('[data-testid="os-modal-panel"]')
    await panel.waitFor()
    await waitForReady(page)

    await expect(panel).toHaveScreenshot('default-size.png')

    await checkA11y(page)
  })

  test('small size', async ({ page }) => {
    await page.goto(`${STORY_URL}--small-size&viewMode=story`)
    const panel = page.locator('[data-testid="os-modal-panel"]')
    await panel.waitFor()
    await waitForReady(page)

    await expect(panel).toHaveScreenshot('small-size.png')

    await checkA11y(page)
  })

  test('large size', async ({ page }) => {
    await page.goto(`${STORY_URL}--large-size&viewMode=story`)
    const panel = page.locator('[data-testid="os-modal-panel"]')
    await panel.waitFor()
    await waitForReady(page)

    await expect(panel).toHaveScreenshot('large-size.png')

    await checkA11y(page)
  })

  test('custom footer', async ({ page }) => {
    await page.goto(`${STORY_URL}--custom-footer&viewMode=story`)
    const panel = page.locator('[data-testid="os-modal-panel"]')
    await panel.waitFor()
    await waitForReady(page)

    await expect(panel).toHaveScreenshot('custom-footer.png')

    await checkA11y(page)
  })

  test('scrollable content', async ({ page }) => {
    await page.goto(`${STORY_URL}--scrollable-content&viewMode=story`)
    const panel = page.locator('[data-testid="os-modal-panel"]')
    await panel.waitFor()
    await waitForReady(page)

    await expect(panel).toHaveScreenshot('scrollable-content.png')

    await checkA11y(page)
  })
})
