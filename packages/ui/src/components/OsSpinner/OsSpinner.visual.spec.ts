import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

/**
 * Visual regression tests for OsSpinner component
 *
 * These tests capture screenshots of Storybook stories and compare them
 * against baseline images to detect unintended visual changes.
 * Each test also runs accessibility checks using axe-core.
 *
 * Note: Spinner animations are paused via Playwright's CSS override
 * to ensure deterministic screenshots.
 */

const STORY_URL = '/iframe.html?id=components-osspinner'
const STORY_ROOT = '#storybook-root'

/**
 * Wait for fonts and pause animations for deterministic screenshots
 */
async function waitForReady(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
  // Pause all animations for deterministic screenshots
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-play-state: paused !important; }',
  })
}

/**
 * Helper to run accessibility check on the current page
 */
async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsSpinner keyboard accessibility', () => {
  test('spinner is not focusable and has status role', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-sizes&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const spinners = root.locator('.os-spinner')
    const count = await spinners.count()

    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const spinner = spinners.nth(i)

      await expect(spinner).toHaveAttribute('role', 'status')
      await expect(spinner).not.toHaveAttribute('tabindex')
    }

    // Verify no spinner receives focus via Tab navigation
    await page.keyboard.press('Tab')
    for (let i = 0; i < count; i++) {
      await expect(spinners.nth(i)).not.toBeFocused()
    }
  })
})

test.describe('OsSpinner visual regression', () => {
  test('all sizes', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-sizes&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="all-sizes"]')).toHaveScreenshot('all-sizes.png')

    await checkA11y(page)
  })

  test('inherit color', async ({ page }) => {
    await page.goto(`${STORY_URL}--inherit-color&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="inherit-color"]')).toHaveScreenshot(
      'inherit-color.png',
    )

    await checkA11y(page)
  })

  test('inline with text', async ({ page }) => {
    await page.goto(`${STORY_URL}--inline-with-text&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="inline-text"]')).toHaveScreenshot('inline-text.png')

    await checkA11y(page)
  })
})
