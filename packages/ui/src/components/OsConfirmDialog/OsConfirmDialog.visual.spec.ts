import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=components-osconfirmdialog'
const STORY_ROOT = '#storybook-root'
const PANEL = '[data-testid="os-modal-panel"]'
const CONFIRM = '[data-testid="os-confirm-dialog-confirm"]'
const CANCEL = '[data-testid="os-confirm-dialog-cancel"]'

async function waitForReady(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

async function openStory(page: Page, story: string) {
  await page.goto(`${STORY_URL}${story}&viewMode=story`)
  const panel = page.locator(PANEL)
  await panel.waitFor()
  await waitForReady(page)
  return panel
}

test.describe('OsConfirmDialog keyboard accessibility', () => {
  test('a destructive dialog opens with focus on cancel', async ({ page }) => {
    await openStory(page, '--danger')

    await expect(page.locator(CANCEL)).toBeFocused()
  })

  test('a default dialog opens with focus on confirm', async ({ page }) => {
    await openStory(page, '--default')

    await expect(page.locator(CONFIRM)).toBeFocused()
  })

  test('Tab stays inside the dialog', async ({ page }) => {
    await openStory(page, '--default')
    const close = page.locator('[data-testid="os-modal-close"]')

    // confirm is the last element: Tab wraps to the close button, Shift+Tab back
    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(page.locator(CONFIRM)).toBeFocused()
  })

  test('Enter confirms, the parent closes, focus returns to the trigger', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-trigger&viewMode=story`)
    const trigger = page.locator('[data-testid="open-dialog"]')
    await trigger.waitFor()

    await page.keyboard.press('Tab')
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Enter')

    const confirm = page.locator(CONFIRM)
    await expect(confirm).toBeFocused()
    await checkA11y(page)

    await page.keyboard.press('Enter')
    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(page.locator('[data-testid="result"]')).toHaveText('Result: confirmed')
    await expect(trigger).toBeFocused()
  })

  test('Escape cancels and returns focus to the trigger', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-trigger&viewMode=story`)
    const trigger = page.locator('[data-testid="open-dialog"]')
    await trigger.click()
    await expect(page.locator(CONFIRM)).toBeFocused()

    await page.keyboard.press('Escape')

    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(page.locator('[data-testid="result"]')).toHaveText('Result: cancelled')
    await expect(trigger).toBeFocused()
  })
})

test.describe('OsConfirmDialog visual regression', () => {
  test('default', async ({ page }) => {
    const panel = await openStory(page, '--default')

    await expect(panel).toHaveScreenshot('default.png')

    await checkA11y(page)
  })

  test('danger', async ({ page }) => {
    const panel = await openStory(page, '--danger')

    await expect(panel).toHaveScreenshot('danger.png')

    await checkA11y(page)
  })

  test('with icons', async ({ page }) => {
    const panel = await openStory(page, '--with-icons')

    await expect(panel).toHaveScreenshot('with-icons.png')

    await checkA11y(page)
  })

  test('loading', async ({ page }) => {
    const panel = await openStory(page, '--loading')

    await expect(page.locator(CONFIRM)).toHaveAttribute('aria-busy', 'true')
    await expect(panel).toHaveScreenshot('loading.png')

    await checkA11y(page)
  })

  test('rich message', async ({ page }) => {
    const panel = await openStory(page, '--rich-message')

    await expect(panel).toHaveScreenshot('rich-message.png')

    await checkA11y(page)
  })
})
