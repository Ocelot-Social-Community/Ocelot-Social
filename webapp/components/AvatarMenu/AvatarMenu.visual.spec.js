const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('AvatarMenu visual regression', () => {
  test('dropdown', async ({ page }) => {
    const root = await gotoStory(page, 'avatarmenu--dropdown')
    await expect(root).toHaveScreenshot('dropdown.png')
  })
})
