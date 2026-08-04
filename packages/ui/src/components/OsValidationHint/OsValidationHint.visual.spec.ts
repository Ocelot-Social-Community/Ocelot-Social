import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=components-osvalidationhint'
const STORY_ROOT = '#storybook-root'

async function waitForReady(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsValidationHint keyboard accessibility', () => {
  test('is not focusable (non-interactive element)', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-variants&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const hints = root.locator('.os-validation-hint')
    const count = await hints.count()

    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await expect(hints.nth(i)).not.toHaveAttribute('tabindex')
    }

    await page.keyboard.press('Tab')
    for (let i = 0; i < count; i++) {
      await expect(hints.nth(i)).not.toBeFocused()
    }
  })
})

test.describe('OsValidationHint visual regression', () => {
  test('all variants', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-variants&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="all-variants"]')).toHaveScreenshot('all-variants.png')

    await checkA11y(page)
  })

  test('error with text', async ({ page }) => {
    await page.goto(`${STORY_URL}--error-with-text&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root).toHaveScreenshot('error-with-text.png')

    await checkA11y(page)
  })

  test('warning with text', async ({ page }) => {
    await page.goto(`${STORY_URL}--warning-with-text&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root).toHaveScreenshot('warning-with-text.png')

    await checkA11y(page)
  })

  test('counter only', async ({ page }) => {
    await page.goto(`${STORY_URL}--counter-only&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root).toHaveScreenshot('counter-only.png')

    await checkA11y(page)
  })

  test('error with count and text', async ({ page }) => {
    await page.goto(`${STORY_URL}--error-with-count-and-text&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root).toHaveScreenshot('error-with-count-and-text.png')

    await checkA11y(page)
  })

  test('warning with count', async ({ page }) => {
    await page.goto(`${STORY_URL}--warning-with-count&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root).toHaveScreenshot('warning-with-count.png')

    await checkA11y(page)
  })

  test('badge only', async ({ page }) => {
    await page.goto(`${STORY_URL}--badge-only&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root).toHaveScreenshot('badge-only.png')

    await checkA11y(page)
  })
})
