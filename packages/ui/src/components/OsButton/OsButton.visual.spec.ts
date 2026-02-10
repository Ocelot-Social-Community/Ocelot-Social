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
 * Helper to run accessibility check on the current page
 */
async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsButton visual regression', () => {
  test('all variants', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-variants&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('.flex')).toHaveScreenshot('all-variants.png')
    await checkA11y(page)
  })

  test('all sizes', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-sizes&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('.flex-col').first()).toHaveScreenshot('all-sizes.png')
    await checkA11y(page)
  })

  test('appearance outline', async ({ page }) => {
    await page.goto(`${STORY_URL}--appearance-outline&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('.flex')).toHaveScreenshot('appearance-outline.png')
    await checkA11y(page)
  })

  test('ghost appearance', async ({ page }) => {
    await page.goto(`${STORY_URL}--ghost&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('button')).toHaveScreenshot('ghost.png')
    await checkA11y(page)
  })

  test('all appearances', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-appearances&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('.flex-col').first()).toHaveScreenshot('all-appearances.png')
    await checkA11y(page)
  })

  test('disabled state', async ({ page }) => {
    await page.goto(`${STORY_URL}--disabled&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('button')).toHaveScreenshot('disabled.png')
    await checkA11y(page)
  })

  test('full width', async ({ page }) => {
    await page.goto(`${STORY_URL}--full-width&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('button')).toHaveScreenshot('full-width.png')
    await checkA11y(page)
  })
})
