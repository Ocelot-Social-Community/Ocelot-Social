import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

/**
 * Visual regression tests for Ocelot Icons
 *
 * These tests capture screenshots of Storybook stories and compare them
 * against baseline images to detect unintended visual changes.
 * Each test also runs accessibility checks using axe-core.
 */

const STORY_URL = '/iframe.html?id=ocelot-icons'
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

test.describe('OcelotIcons keyboard accessibility', () => {
  test('all icons are decorative (not focusable)', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-icons&viewMode=story`)
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

test.describe('OcelotIcons visual regression', () => {
  test('all icons', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-icons&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root.locator('.flex').first()).toHaveScreenshot('all-icons.png')

    await checkA11y(page)
  })
})
