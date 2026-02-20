import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=components-osnumber'
const STORY_ROOT = '#storybook-root'

async function waitForReady(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsNumber keyboard accessibility', () => {
  test('number is not focusable (non-interactive element)', async ({ page }) => {
    await page.goto(`${STORY_URL}--static-count&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const numbers = root.locator('.os-number')
    const count = await numbers.count()

    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await expect(numbers.nth(i)).not.toHaveAttribute('tabindex')
      await expect(numbers.nth(i)).not.toHaveAttribute('role')
    }

    await page.keyboard.press('Tab')
    for (let i = 0; i < count; i++) {
      await expect(numbers.nth(i)).not.toBeFocused()
    }
  })
})

test.describe('OsNumber visual regression', () => {
  test('static count', async ({ page }) => {
    await page.goto(`${STORY_URL}--static-count&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="static-count"]')).toHaveScreenshot('static-count.png')

    await checkA11y(page)
  })

  test('with label', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-label&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="with-label"]')).toHaveScreenshot('with-label.png')

    await checkA11y(page)
  })

  test('animated', async ({ page }) => {
    await page.goto(`${STORY_URL}--animated&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    // Wait for animation to complete (first counter animates to 128)
    await expect(root.locator('.os-number-count').first()).toHaveText('128', { timeout: 3000 })

    await expect(root.locator('[data-testid="animated"]')).toHaveScreenshot('animated.png')

    await checkA11y(page)
  })

  test('multiple counters', async ({ page }) => {
    await page.goto(`${STORY_URL}--multiple-counters&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="multiple-counters"]')).toHaveScreenshot(
      'multiple-counters.png',
    )

    await checkA11y(page)
  })
})
