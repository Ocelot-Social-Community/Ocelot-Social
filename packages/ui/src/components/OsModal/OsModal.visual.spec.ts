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
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const closeBtn = root.locator('[data-testid="os-modal-close"]')
    await expect(closeBtn).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(closeBtn).toBeFocused()
  })

  test('footer buttons are focusable via Tab', async ({ page }) => {
    await page.goto(`${STORY_URL}--built-in-buttons&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const cancelBtn = root.locator('[data-testid="os-modal-cancel"]')
    const confirmBtn = root.locator('[data-testid="os-modal-confirm"]')
    await expect(cancelBtn).toBeVisible()
    await expect(confirmBtn).toBeVisible()

    // Tab through to find the buttons
    await page.keyboard.press('Tab') // close button
    await page.keyboard.press('Tab') // cancel
    await expect(cancelBtn).toBeFocused()
    await page.keyboard.press('Tab') // confirm
    await expect(confirmBtn).toBeFocused()
  })

  test('force mode has no close button to focus', async ({ page }) => {
    await page.goto(`${STORY_URL}--force-mode&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const closeBtn = root.locator('[data-testid="os-modal-close"]')
    await expect(closeBtn).toHaveCount(0)
  })
})

test.describe('OsModal visual regression', () => {
  test('default size', async ({ page }) => {
    await page.goto(`${STORY_URL}--default-size&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="default-size"]')).toHaveScreenshot('default-size.png')

    await checkA11y(page)
  })

  test('extended size', async ({ page }) => {
    await page.goto(`${STORY_URL}--extended-size&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="extended-size"]')).toHaveScreenshot(
      'extended-size.png',
    )

    await checkA11y(page)
  })

  test('custom footer', async ({ page }) => {
    await page.goto(`${STORY_URL}--custom-footer&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="custom-footer"]')).toHaveScreenshot(
      'custom-footer.png',
    )

    await checkA11y(page)
  })

  test('force mode', async ({ page }) => {
    await page.goto(`${STORY_URL}--force-mode&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="force-mode"]')).toHaveScreenshot('force-mode.png')

    await checkA11y(page)
  })

  test('scrollable content', async ({ page }) => {
    await page.goto(`${STORY_URL}--scrollable-content&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="scrollable-content"]')).toHaveScreenshot(
      'scrollable-content.png',
    )

    await checkA11y(page)
  })
})
