import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=ocelot-actionbutton'
const STORY_ROOT = '#storybook-root'

async function waitForFonts(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OcelotActionButton keyboard accessibility', () => {
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

test.describe('OcelotActionButton visual regression', () => {
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

  test('loading', async ({ page }) => {
    await page.goto(`${STORY_URL}--loading&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)
    await page.evaluate(() => {
      document.querySelectorAll('.os-button__spinner, .os-button__spinner circle').forEach((el) => {
        ;(el as HTMLElement).style.animationPlayState = 'paused'
      })
    })

    await expect(root).toHaveScreenshot('loading.png')

    await checkA11y(page)
  })

  test('disabled', async ({ page }) => {
    await page.goto(`${STORY_URL}--disabled&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('disabled.png')

    await checkA11y(page)
  })
})
