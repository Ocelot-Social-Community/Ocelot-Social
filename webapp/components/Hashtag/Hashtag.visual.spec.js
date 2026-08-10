const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('Hashtag visual regression', () => {
  test('clickable', async ({ page }) => {
    const root = await gotoStory(page, 'hashtag--clickable')
    await expect(root).toHaveScreenshot('clickable.png')
  })
})
