const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('Editor visual regression', () => {
  test('empty', async ({ page }) => {
    const root = await gotoStory(page, 'editor--empty')
    await expect(root).toHaveScreenshot('empty.png')
  })

  test('basic formatting', async ({ page }) => {
    const root = await gotoStory(page, 'editor--basic-formatting')
    await expect(root).toHaveScreenshot('basic-formatting.png')
  })

  test('mentions', async ({ page }) => {
    const root = await gotoStory(page, 'editor--mentions')
    await expect(root).toHaveScreenshot('mentions.png')
  })

  test('hashtags', async ({ page }) => {
    const root = await gotoStory(page, 'editor--hashtags')
    await expect(root).toHaveScreenshot('hashtags.png')
  })

  test('embeds with iframe', async ({ page }) => {
    const root = await gotoStory(page, 'editor--embeds-with-iframe')
    await expect(root).toHaveScreenshot('embeds-with-iframe.png')
  })

  test('embeds with plain link', async ({ page }) => {
    const root = await gotoStory(page, 'editor--embeds-with-plain-link')
    await expect(root).toHaveScreenshot('embeds-with-plain-link.png')
  })
})
