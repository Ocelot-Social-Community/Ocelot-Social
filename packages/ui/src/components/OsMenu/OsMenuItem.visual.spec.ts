import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

/**
 * OsMenuItem visual tests — uses OsMenu stories since
 * OsMenuItem is always rendered within an OsMenu context.
 */

const STORY_URL = '/iframe.html?id=components-osmenuitem'
const STORY_ROOT = '#storybook-root'

async function waitForFonts(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsMenuItem keyboard accessibility', () => {
  test('menu items are focusable via links', async ({ page }) => {
    await page.goto(`${STORY_URL}--in-dropdown&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const links = root.locator('.os-menu-item-link')
    const count = await links.count()

    expect(count).toBeGreaterThan(0)
  })
})

test.describe('OsMenuItem visual regression', () => {
  test('custom menu item', async ({ page }) => {
    await page.goto(`${STORY_URL}--in-dropdown&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForFonts(page)

    await expect(root).toHaveScreenshot('menuitem-custom.png')

    await checkA11y(page)
  })
})
