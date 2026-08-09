const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('Empty visual regression', () => {
  test('tasks icon with message', async ({ page }) => {
    const root = await gotoStory(page, 'empty--tasks-icon-with-message')
    await expect(root).toHaveScreenshot('tasks-icon-with-message.png')
  })

  test('default icon, no message', async ({ page }) => {
    const root = await gotoStory(page, 'empty--default-icon-no-message')
    await expect(root).toHaveScreenshot('default-icon-no-message.png')
  })
})
