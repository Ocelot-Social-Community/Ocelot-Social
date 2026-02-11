import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

/**
 * Visual regression tests for OsButton component
 *
 * These tests capture screenshots of Storybook stories and compare them
 * against baseline images to detect unintended visual changes.
 * Each test also runs accessibility checks using axe-core.
 */

const STORY_URL = '/iframe.html?id=components-osbutton'
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

test.describe('OsButton keyboard accessibility', () => {
  test('all variants show visible focus indicator', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-appearances&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const buttons = root.locator('button:not([disabled])')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i)
      await button.focus()
      const outline = await button.evaluate((el) => getComputedStyle(el).outlineStyle)
      const label = (await button.textContent()) ?? ''
      expect(outline, `Button "${label}" must have visible focus outline`).not.toBe('none')
    }
  })
})

test.describe('OsButton visual regression', () => {
  test('all variants', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-variants&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex')).toHaveScreenshot('all-variants.png')
    await checkA11y(page)
  })

  test('all sizes', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-sizes&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex-col').first()).toHaveScreenshot('all-sizes.png')
    await checkA11y(page)
  })

  test('appearance filled', async ({ page }) => {
    await page.goto(`${STORY_URL}--appearance-filled&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex')).toHaveScreenshot('appearance-filled.png')
    await checkA11y(page)
  })

  test('appearance outline', async ({ page }) => {
    await page.goto(`${STORY_URL}--appearance-outline&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex')).toHaveScreenshot('appearance-outline.png')
    await checkA11y(page)
  })

  test('appearance ghost', async ({ page }) => {
    await page.goto(`${STORY_URL}--appearance-ghost&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex')).toHaveScreenshot('appearance-ghost.png')
    await checkA11y(page)
  })

  test('all appearances', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-appearances&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex-col').first()).toHaveScreenshot('all-appearances.png')
    await checkA11y(page)
  })

  test('disabled state', async ({ page }) => {
    await page.goto(`${STORY_URL}--disabled&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex-col').first()).toHaveScreenshot('disabled.png')
    await checkA11y(page)
  })

  test('full width', async ({ page }) => {
    await page.goto(`${STORY_URL}--full-width&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex-col').first()).toHaveScreenshot('full-width.png')
    await checkA11y(page)
  })

  test('icon', async ({ page }) => {
    await page.goto(`${STORY_URL}--icon&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex')).toHaveScreenshot('icon.png')
    await checkA11y(page)
  })

  test('icon only', async ({ page }) => {
    await page.goto(`${STORY_URL}--icon-only&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex')).toHaveScreenshot('icon-only.png')
    await checkA11y(page)
  })

  test('icon sizes', async ({ page }) => {
    await page.goto(`${STORY_URL}--icon-sizes&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex')).toHaveScreenshot('icon-sizes.png')
    await checkA11y(page)
  })

  test('icon appearances', async ({ page }) => {
    await page.goto(`${STORY_URL}--icon-appearances&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await expect(root.locator('.flex-col').first()).toHaveScreenshot('icon-appearances.png')
    await checkA11y(page)
  })
})
