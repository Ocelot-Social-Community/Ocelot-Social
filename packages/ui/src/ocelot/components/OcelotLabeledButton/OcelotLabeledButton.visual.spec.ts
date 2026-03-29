import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=ocelot-labeledbutton'
const STORY_ROOT = '#storybook-root'

async function waitForFonts(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OcelotLabeledButton keyboard accessibility', () => {
  test('button shows visible focus indicator', async ({ page }) => {
    await page.goto(`${STORY_URL}--playground&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    await page.keyboard.press('Tab')
    const button = root.locator('button').first()
    const outline = await button.evaluate((el) => getComputedStyle(el).outlineStyle)

    expect(outline, 'Button must have visible focus outline via Tab').not.toBe('none')
  })
})

test.describe('OcelotLabeledButton visual regression', () => {
  test('playground', async ({ page }) => {
    await page.goto(`${STORY_URL}--playground&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('playground.png')

    await checkA11y(page)
  })

  test('filled', async ({ page }) => {
    await page.goto(`${STORY_URL}--filled&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('filled.png')

    await checkA11y(page)
  })

  test('multiple buttons', async ({ page }) => {
    await page.goto(`${STORY_URL}--multiple-buttons&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('multiple-buttons.png')

    await checkA11y(page)
  })
})
