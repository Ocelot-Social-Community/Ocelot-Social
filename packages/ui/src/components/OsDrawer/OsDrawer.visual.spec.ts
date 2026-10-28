import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=components-osdrawer'
const STORY_ROOT = '#storybook-root'

async function waitForReady(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsDrawer keyboard accessibility', () => {
  test('focus is on the panel when it opens, and Tab stays inside', async ({ page }) => {
    await page.goto(`${STORY_URL}--right&viewMode=story`)
    const panel = page.locator('[data-testid="os-drawer-panel"]')
    await expect(panel).toBeFocused()

    const close = page.locator('[data-testid="os-drawer-close"]')
    const link = panel.locator('a')
    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(link).toBeFocused()
  })

  test('Escape closes it and gives the focus back to the opener', async ({ page }) => {
    await page.goto(`${STORY_URL}--playground&viewMode=story`)
    const opener = page.getByRole('button', { name: 'Open drawer' })
    await opener.click()
    const panel = page.locator('[data-testid="os-drawer-panel"]')
    await expect(panel).toBeFocused()

    await page.keyboard.press('Escape')

    await expect(panel).toBeHidden()
    await expect(opener).toBeFocused()
  })
})

test.describe('OsDrawer visual regression', () => {
  test('right', async ({ page }) => {
    await page.goto(`${STORY_URL}--right&viewMode=story`)
    const panel = page.locator('[data-testid="os-drawer-panel"]')
    await expect(panel).toBeVisible()
    await waitForReady(page)

    await expect(page).toHaveScreenshot('right.png')

    await checkA11y(page)
  })

  test('left', async ({ page }) => {
    await page.goto(`${STORY_URL}--left&viewMode=story`)
    const panel = page.locator('[data-testid="os-drawer-panel"]')
    await expect(panel).toBeVisible()
    await waitForReady(page)

    await expect(page).toHaveScreenshot('left.png')

    await checkA11y(page)
  })
})
