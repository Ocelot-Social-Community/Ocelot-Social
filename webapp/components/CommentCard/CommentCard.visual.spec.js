const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('CommentCard visual regression', () => {
  test('basic comment', async ({ page }) => {
    const root = await gotoStory(page, 'commentcard--basic-comment')
    await expect(root).toHaveScreenshot('basic-comment.png')
  })
})
