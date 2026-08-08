const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('CommentList visual regression', () => {
  test('given 10 comments', async ({ page }) => {
    const root = await gotoStory(page, 'commentlist--given-10-comments')
    await expect(root).toHaveScreenshot('given-10-comments.png')
  })
})
