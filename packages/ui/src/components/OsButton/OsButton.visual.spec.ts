import { expect, test } from '@playwright/test'

/**
 * Visual regression tests for OsButton component
 *
 * These tests capture screenshots of Storybook stories and compare them
 * against baseline images to detect unintended visual changes.
 */

const STORY_URL = '/iframe.html?id=components-osbutton'
const STORY_ROOT = '#storybook-root'

test.describe('OsButton visual regression', () => {
  test('primary variant', async ({ page }) => {
    await page.goto(`${STORY_URL}--primary&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('button')).toHaveScreenshot('primary.png')
  })

  test('secondary variant', async ({ page }) => {
    await page.goto(`${STORY_URL}--secondary&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('button')).toHaveScreenshot('secondary.png')
  })

  test('danger variant', async ({ page }) => {
    await page.goto(`${STORY_URL}--danger&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('button')).toHaveScreenshot('danger.png')
  })

  test('all variants', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-variants&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('.flex')).toHaveScreenshot('all-variants.png')
  })

  test('all sizes', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-sizes&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('.flex')).toHaveScreenshot('all-sizes.png')
  })

  test('disabled state', async ({ page }) => {
    await page.goto(`${STORY_URL}--disabled&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('button')).toHaveScreenshot('disabled.png')
  })

  test('full width', async ({ page }) => {
    await page.goto(`${STORY_URL}--full-width&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await expect(root.locator('button')).toHaveScreenshot('full-width.png')
  })
})
