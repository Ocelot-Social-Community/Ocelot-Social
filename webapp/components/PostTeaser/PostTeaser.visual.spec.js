const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('PostTeaser visual regression', () => {
  test('without image', async ({ page }) => {
    const root = await gotoStory(page, 'postteaser--without-image')
    await expect(root).toHaveScreenshot('without-image.png')
  })

  test('with image', async ({ page }) => {
    const root = await gotoStory(page, 'postteaser--with-image')
    await expect(root).toHaveScreenshot('with-image.png')
  })

  test('pinned by admin', async ({ page }) => {
    const root = await gotoStory(page, 'postteaser--pinned-by-admin')
    await expect(root).toHaveScreenshot('pinned-by-admin.png')
  })
})
