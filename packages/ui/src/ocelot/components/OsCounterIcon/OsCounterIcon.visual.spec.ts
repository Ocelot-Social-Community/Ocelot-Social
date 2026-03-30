import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=ocelot-countericon'
const STORY_ROOT = '#storybook-root'

async function waitForFonts(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsCounterIcon keyboard accessibility', () => {
  test('element is not focusable (decorative)', async ({ page }) => {
    await page.goto(`${STORY_URL}--playground&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    await page.keyboard.press('Tab')

    // CounterIcon should not receive focus — it's decorative
    const counterIcon = root.locator('.os-counter-icon').first()
    const isFocused = await counterIcon.evaluate((el) => document.activeElement === el)

    expect(isFocused).toBe(false)
  })
})

test.describe('OsCounterIcon visual regression', () => {
  test('playground', async ({ page }) => {
    await page.goto(`${STORY_URL}--playground&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('playground.png')

    await checkA11y(page)
  })

  test('danger', async ({ page }) => {
    await page.goto(`${STORY_URL}--danger&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('danger.png')

    await checkA11y(page)
  })

  test('soft', async ({ page }) => {
    await page.goto(`${STORY_URL}--soft&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('soft.png')

    await checkA11y(page)
  })

  test('capped', async ({ page }) => {
    await page.goto(`${STORY_URL}--capped&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('capped.png')

    await checkA11y(page)
  })

  test('zero', async ({ page }) => {
    await page.goto(`${STORY_URL}--zero&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('zero.png')

    await checkA11y(page)
  })
})
