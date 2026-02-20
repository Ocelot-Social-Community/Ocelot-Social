import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=components-osbadge'
const STORY_ROOT = '#storybook-root'

async function waitForReady(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

test.describe('OsBadge keyboard accessibility', () => {
  test('badge is not focusable (non-interactive element)', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-variants&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()

    const badges = root.locator('.os-badge')
    const count = await badges.count()

    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).not.toHaveAttribute('tabindex')
      await expect(badges.nth(i)).not.toHaveAttribute('role')
    }

    await page.keyboard.press('Tab')
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).not.toBeFocused()
    }
  })
})

test.describe('OsBadge visual regression', () => {
  test('all variants', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-variants&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="all-variants"]')).toHaveScreenshot('all-variants.png')

    await checkA11y(page)
  })

  test('all sizes', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-sizes&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="all-sizes"]')).toHaveScreenshot('all-sizes.png')

    await checkA11y(page)
  })

  test('all shapes', async ({ page }) => {
    await page.goto(`${STORY_URL}--all-shapes&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="all-shapes"]')).toHaveScreenshot('all-shapes.png')

    await checkA11y(page)
  })

  test('form counter', async ({ page }) => {
    await page.goto(`${STORY_URL}--form-counter&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="form-counter"]')).toHaveScreenshot('form-counter.png')

    await checkA11y(page)
  })

  test('with icon', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-icon&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="with-icon"]')).toHaveScreenshot('with-icon.png')

    await checkA11y(page)
  })
})
