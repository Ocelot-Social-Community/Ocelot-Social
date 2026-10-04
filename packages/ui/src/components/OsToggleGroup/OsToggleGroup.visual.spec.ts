import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=components-ostogglegroup'
const STORY_ROOT = '#storybook-root'

async function waitForReady(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).analyze()

  expect(results.violations).toEqual([])
}

async function open(page: Page, story: string) {
  await page.goto(`${STORY_URL}--${story}&viewMode=story`)
  const root = page.locator(STORY_ROOT)
  await root.waitFor()
  await waitForReady(page)
  return root
}

test.describe('OsToggleGroup keyboard accessibility', () => {
  test('the group is one tab stop: the current option', async ({ page }) => {
    const root = await open(page, 'default')

    await page.keyboard.press('Tab')

    await expect(root.getByRole('radio', { name: 'Public' })).toBeFocused()
  })

  test('arrow keys move and pick, skipping disabled options', async ({ page }) => {
    const root = await open(page, 'with-disabled')

    await page.keyboard.press('Tab')
    await page.keyboard.press('ArrowRight')

    const closed = root.getByRole('radio', { name: 'Closed' })
    await expect(closed).toBeFocused()
    await expect(closed).toHaveAttribute('aria-checked', 'true')

    // Secret is disabled: the next step wraps around to Public.
    await page.keyboard.press('ArrowRight')
    await expect(root.getByRole('radio', { name: 'Public' })).toBeFocused()
  })
})

test.describe('OsToggleGroup visual regression', () => {
  test('default', async ({ page }) => {
    await page.goto(`${STORY_URL}--default&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="default"]')).toHaveScreenshot('default.png')

    await checkA11y(page)
  })

  test('none selected', async ({ page }) => {
    await page.goto(`${STORY_URL}--none-selected&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="none-selected"]')).toHaveScreenshot(
      'none-selected.png',
    )

    await checkA11y(page)
  })

  test('with disabled', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-disabled&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="with-disabled"]')).toHaveScreenshot(
      'with-disabled.png',
    )

    await checkA11y(page)
  })

  test('highlighted', async ({ page }) => {
    await page.goto(`${STORY_URL}--highlighted&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="highlighted"]')).toHaveScreenshot('highlighted.png')

    await checkA11y(page)
  })

  test('with extra content', async ({ page }) => {
    await page.goto(`${STORY_URL}--with-extra-content&viewMode=story`)
    const root = page.locator(STORY_ROOT)
    await root.waitFor()
    await waitForReady(page)

    await expect(root.locator('[data-testid="with-extra-content"]')).toHaveScreenshot(
      'with-extra-content.png',
    )

    await checkA11y(page)
  })
})
