import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=ocelot-ribbon'
const STORY_ROOT = '#storybook-root'

async function waitForFonts(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsRibbon keyboard accessibility', () => {
  test('element is not focusable (decorative)', async ({ page }) => {
    await page.goto(`${STORY_URL}--article&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    await page.keyboard.press('Tab')

    const ribbon = root.locator('.os-ribbon').first()
    const isFocused = await ribbon.evaluate((el) => document.activeElement === el)

    expect(isFocused).toBe(false)
  })
})

test.describe('OsRibbon visual regression', () => {
  test('article', async ({ page }) => {
    await page.goto(`${STORY_URL}--article&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('article.png')

    await checkA11y(page)
  })

  test('event', async ({ page }) => {
    await page.goto(`${STORY_URL}--event&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('event.png')

    await checkA11y(page)
  })

  test('pinned', async ({ page }) => {
    await page.goto(`${STORY_URL}--pinned&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('pinned.png')

    await checkA11y(page)
  })
})
