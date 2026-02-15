import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

/**
 * Visual regression tests for OsIcon component
 *
 * These tests capture screenshots of Storybook stories and compare them
 * against baseline images to detect unintended visual changes.
 * Each test also runs accessibility checks using axe-core.
 */

const STORY_URL = '/iframe.html?id=components-osicon'
const STORY_ROOT = '#storybook-root'

/**
 * Wait for all fonts to be loaded before taking screenshots
 */
async function waitForFonts(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

/**
 * Helper to run accessibility check on the current page
 */
async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsIcon keyboard accessibility', () => {
  test('decorative icons are not focusable', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-system-icons&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const icons = root.locator('.os-icon')
    const count = await icons.count()

    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const icon = icons.nth(i)

      await expect(icon).toHaveAttribute('aria-hidden', 'true')
    }
  })
})

test.describe('OsIcon visual regression', () => {
  test('all system icons', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-system-icons&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root.locator('.grid')).toHaveScreenshot('all-system-icons.png')

    await checkA11y(page)
  })

  test('all sizes', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-sizes&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root.locator('.flex').first()).toHaveScreenshot('all-sizes.png')

    await checkA11y(page)
  })

  test('custom component', async ({ page }) => {
    await page.goto(`${STORY_URL}--custom-component&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root.locator('.flex').first()).toHaveScreenshot('custom-component.png')

    await checkA11y(page)
  })

  test('inherit color', async ({ page }) => {
    await page.goto(`${STORY_URL}--inherit-color&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root.locator('.flex').first()).toHaveScreenshot('inherit-color.png')

    await checkA11y(page)
  })

  test('in button', async ({ page }) => {
    await page.goto(`${STORY_URL}--in-button&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root.locator('.flex').first()).toHaveScreenshot('in-button.png')

    await checkA11y(page)
  })
})
