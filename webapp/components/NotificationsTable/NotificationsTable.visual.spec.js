const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('NotificationsTable visual regression', () => {
  test('with notifications', async ({ page }) => {
    const root = await gotoStory(page, 'notificationstable--with-notifications')
    await expect(root).toHaveScreenshot('with-notifications.png')
  })

  test('without notifications', async ({ page }) => {
    const root = await gotoStory(page, 'notificationstable--without-notifications')
    await expect(root).toHaveScreenshot('without-notifications.png')
  })
})
