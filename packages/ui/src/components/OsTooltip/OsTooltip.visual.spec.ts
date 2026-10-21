import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

const STORY_URL = '/iframe.html?id=components-ostooltip'
const STORY_ROOT = '#storybook-root'
const TOOLTIP = '[role="tooltip"]'
const SHOWN = '.os-tooltip--visible'

async function waitForReady(page: Page) {
  await page.evaluate(async () => document.fonts.ready)
}

/** The story and its tooltips, which live under <body>, outside the story's root. */
async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page }).include(STORY_ROOT).include(TOOLTIP).analyze()

  expect(results.violations).toEqual([])
}

async function open(page: Page, story: string) {
  await page.goto(`${story}&viewMode=story`)
  const root = page.locator(STORY_ROOT)
  await root.waitFor()
  await waitForReady(page)
  return root
}

test.describe('OsTooltip keyboard accessibility', () => {
  test('keyboard focus shows the tooltip the element is described by', async ({ page }) => {
    const root = await open(page, `${STORY_URL}--directive`)
    const button = root.getByRole('button', { name: 'Delete' })

    await page.keyboard.press('Tab')

    await expect(button).toBeFocused()
    await expect(page.locator(SHOWN)).toHaveText('Delete the post')
    await expect(button).toHaveAccessibleDescription('Delete the post')
  })

  test('Esc hides the tooltip, focus stays', async ({ page }) => {
    const root = await open(page, `${STORY_URL}--directive`)
    await page.keyboard.press('Tab')
    await expect(page.locator(SHOWN)).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.locator(SHOWN)).toHaveCount(0)
    await expect(root.getByRole('button', { name: 'Delete' })).toBeFocused()
  })

  test('moving on hides it and shows the next one', async ({ page }) => {
    await open(page, `${STORY_URL}--directive`)
    await page.keyboard.press('Tab')
    await expect(page.locator(SHOWN)).toHaveText('Delete the post')

    await page.keyboard.press('Tab')

    await expect(page.locator(SHOWN)).toHaveText('Share the post')
  })

  test('a click does not bring it up', async ({ page }) => {
    const root = await open(page, `${STORY_URL}--directive`)
    const button = root.getByRole('button', { name: 'Delete' })

    await button.click()
    // eslint-disable-next-line playwright/no-wait-for-timeout -- the show delay has to pass
    await page.waitForTimeout(1000)

    await expect(page.locator(SHOWN)).toHaveCount(0)
  })
})

test.describe('OsTooltip hover', () => {
  test('shows after the delay and stays while the pointer is on it', async ({ page }) => {
    const root = await open(page, `${STORY_URL}--directive`)

    await root.getByRole('button', { name: 'Delete' }).hover()
    await expect(page.locator(SHOWN)).toHaveText('Delete the post')

    await page.locator(SHOWN).hover()
    // eslint-disable-next-line playwright/no-wait-for-timeout -- the hide delay has to pass
    await page.waitForTimeout(200)

    await expect(page.locator(SHOWN)).toBeVisible()

    await page.mouse.move(0, 0)

    await expect(page.locator(SHOWN)).toHaveCount(0)
  })
})

test.describe('OsTooltip visual regression', () => {
  test('placements', async ({ page }) => {
    const root = await open(page, `${STORY_URL}--placements`)

    await expect(root.locator('[data-testid="placements"]')).toHaveScreenshot('placements.png')

    await checkA11y(page)
  })

  test('multiline', async ({ page }) => {
    const root = await open(page, `${STORY_URL}--multiline`)

    await expect(root.locator('[data-testid="multiline"]')).toHaveScreenshot('multiline.png')

    await checkA11y(page)
  })

  test('narrow', async ({ page }) => {
    const root = await open(page, `${STORY_URL}--narrow`)

    await expect(root.locator('[data-testid="narrow"]')).toHaveScreenshot('narrow.png')

    await checkA11y(page)
  })

  test('plain text', async ({ page }) => {
    const root = await open(page, `${STORY_URL}--plain-text`)

    await expect(root.locator('[data-testid="plain-text"]')).toHaveScreenshot('plain-text.png')

    await checkA11y(page)
  })

  test('directive', async ({ page }) => {
    const root = await open(page, `${STORY_URL}--directive`)
    await page.keyboard.press('Tab')
    await expect(page.locator(SHOWN)).toBeVisible()

    await expect(root.locator('[data-testid="directive"]')).toHaveScreenshot('directive.png')

    await checkA11y(page)
  })
})
