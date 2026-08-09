const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('UserAvatar visual regression', () => {
  test('user only', async ({ page }) => {
    const root = await gotoStory(page, 'useravatar--user-only')
    await expect(root).toHaveScreenshot('user-only.png')
  })

  test('with date', async ({ page }) => {
    const root = await gotoStory(page, 'useravatar--with-date')
    await expect(root).toHaveScreenshot('with-date.png')
  })

  test('has edited something', async ({ page }) => {
    const root = await gotoStory(page, 'useravatar--has-edited-something')
    await expect(root).toHaveScreenshot('has-edited-something.png')
  })

  test('anonymous', async ({ page }) => {
    const root = await gotoStory(page, 'useravatar--anonymous')
    await expect(root).toHaveScreenshot('anonymous.png')
  })

  test('with group and date', async ({ page }) => {
    const root = await gotoStory(page, 'useravatar--with-group-and-date')
    await expect(root).toHaveScreenshot('with-group-and-date.png')
  })

  test('with group and date, wide', async ({ page }) => {
    const root = await gotoStory(page, 'useravatar--with-group-and-date-wide')
    await expect(root).toHaveScreenshot('with-group-and-date-wide.png')
  })
})
