const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

// Phones, upright and turned (#11079). The smallest stands in for a screen with the browser's own
// bars shown — Playwright has no such bars, so that height is set directly.
const PHONES = [
  { name: 'phone-short', width: 360, height: 560 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'phone-landscape', width: 740, height: 360 },
]

test.describe('PreJoin visual regression', () => {
  for (const { name, width, height } of PHONES) {
    test(`join and cancel in view without scrolling, ${name} (${width}x${height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height })
      await gotoStory(page, 'prejoin--full-screen')
      // The device list has arrived: the dialog is as long as it gets.
      await expect(page.locator('#prejoin-speaker')).toBeVisible()

      await expect(page.locator('[data-test="prejoin-join"]')).toBeInViewport({ ratio: 1 })
      await expect(page.locator('[data-test="prejoin-cancel"]')).toBeInViewport({ ratio: 1 })
      // The whole screen: the dialog fills it, and #storybook-root does not.
      await expect(page).toHaveScreenshot(`${name}.png`)
    })
  }
})
