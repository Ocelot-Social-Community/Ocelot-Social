const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('LoginForm visual regression', () => {
  test('successful login', async ({ page }) => {
    const root = await gotoStory(page, 'loginform--successful-login')
    await expect(root).toHaveScreenshot('successful-login.png')
  })

  test('unsuccessful login', async ({ page }) => {
    const root = await gotoStory(page, 'loginform--unsuccessful-login')
    await expect(root).toHaveScreenshot('unsuccessful-login.png')
  })
})
