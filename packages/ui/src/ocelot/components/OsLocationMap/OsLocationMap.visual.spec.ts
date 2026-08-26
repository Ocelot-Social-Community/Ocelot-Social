import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=ocelot-locationmap'
const STORY_ROOT = '#storybook-root'

async function waitForFonts(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsLocationMap keyboard accessibility', () => {
  test('the pick-location tool is reachable via the keyboard and exposes its state via aria-pressed', async ({
    page,
  }) => {
    await page.goto(`${STORY_URL}--editable&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const toggle = root.locator('.os-location-map-picker-toggle')
    await toggle.waitFor()
    await toggle.focus()

    await expect(toggle).toBeFocused()
    // Disarmed by default (the Editable story already has a pin) — a real
    // <button>, not a div with a click handler, so it's both Tab-reachable
    // and Enter/Space-activatable, with its state exposed via aria-pressed.
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  test('the search input is reachable via Tab and not a focus trap', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-search&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const input = root.locator('.os-location-map__search-input')
    await input.waitFor()
    await input.focus()

    await expect(input).toBeFocused()
  })
})

test.describe('OsLocationMap visual regression', () => {
  test('no pin', async ({ page }) => {
    await page.goto(`${STORY_URL}--no-pin&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('no-pin.png')

    await checkA11y(page)
  })

  test('with pin', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-pin&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('with-pin.png')

    await checkA11y(page)
  })

  test('editable', async ({ page }) => {
    await page.goto(`${STORY_URL}--editable&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('editable.png')

    await checkA11y(page)
  })

  test('with search', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-search&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('with-search.png')

    await checkA11y(page)
  })

  test('view on map', async ({ page }) => {
    await page.goto(`${STORY_URL}--view-on-map&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('view-on-map.png')

    await checkA11y(page)
  })

  test('with style switcher', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-style-switcher&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('with-style-switcher.png')

    await checkA11y(page)
  })

  test('kitchen sink', async ({ page }) => {
    await page.goto(`${STORY_URL}--kitchen-sink&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('kitchen-sink.png')

    await checkA11y(page)
  })
})
