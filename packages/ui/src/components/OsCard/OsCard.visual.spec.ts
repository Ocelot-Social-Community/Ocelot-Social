import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=components-oscard'
const STORY_ROOT = '#storybook-root'

async function waitForReady(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsCard keyboard accessibility', () => {
  test('card is not focusable (non-interactive element)', async ({ page }) => {
    await page.goto(`${STORY_URL}--simple-wrapper&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const cards = root.locator('.os-card')
    const count = await cards.count()

    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).not.toHaveAttribute('tabindex')
      await expect(cards.nth(i)).not.toHaveAttribute('role')
    }

    await page.keyboard.press('Tab')
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).not.toBeFocused()
    }
  })
})

test.describe('OsCard visual regression', () => {
  test('simple wrapper', async ({ page }) => {
    await page.goto(`${STORY_URL}--simple-wrapper&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="simple-wrapper"]')).toHaveScreenshot(
      'simple-wrapper.png',
    )

    await checkA11y(page)
  })

  test('custom class', async ({ page }) => {
    await page.goto(`${STORY_URL}--custom-class&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="custom-class"]')).toHaveScreenshot('custom-class.png')

    await checkA11y(page)
  })
})
