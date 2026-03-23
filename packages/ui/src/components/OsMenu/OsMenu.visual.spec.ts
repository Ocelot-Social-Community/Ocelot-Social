import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=components-osmenu'
const STORY_ROOT = '#storybook-root'

async function waitForFonts(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsMenu keyboard accessibility', () => {
  test('menu items are focusable via links', async ({ page }) => {
    await page.goto(`${STORY_URL}--sidebar&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const links = root.locator('.ds-menu-item-link')
    const count = await links.count()

    expect(count).toBeGreaterThan(0)

    // Tab through links
    for (let i = 0; i < count; i++) {
      await page.keyboard.press('Tab')
      const focused = page.locator(':focus')
      const focusedClass = await focused.getAttribute('class')

      expect(focusedClass).toContain('ds-menu-item-link')
    }
  })
})

test.describe('OsMenu visual regression', () => {
  test('sidebar', async ({ page }) => {
    await page.goto(`${STORY_URL}--sidebar&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('sidebar.png')

    await checkA11y(page)
  })

  test('sidebar with active item', async ({ page }) => {
    await page.goto(`${STORY_URL}--sidebar-exact-match&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('sidebar-active.png')

    await checkA11y(page)
  })

  test('nested routes', async ({ page }) => {
    await page.goto(`${STORY_URL}--nested-routes&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('nested.png')

    await checkA11y(page)
  })

  test('dropdown menu', async ({ page }) => {
    await page.goto(`${STORY_URL}--dropdown-menu&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('dropdown.png')

    await checkA11y(page)
  })
})
