const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../../../storybook/visual-test-helpers')

test.describe('AvatarImage visual regression', () => {
  test('normal, with image', async ({ page }) => {
    const root = await gotoStory(page, 'avatarimage--normal-with-image')
    await expect(root).toHaveScreenshot('normal-with-image.png')
  })

  test('normal without image, anonymous user', async ({ page }) => {
    const root = await gotoStory(page, 'avatarimage--normal-without-image-anonymous-user')
    await expect(root).toHaveScreenshot('normal-without-image-anonymous-user.png')
  })

  test('normal without image, user initials', async ({ page }) => {
    const root = await gotoStory(page, 'avatarimage--normal-without-image-user-initials')
    await expect(root).toHaveScreenshot('normal-without-image-user-initials.png')
  })

  test('small, with image', async ({ page }) => {
    const root = await gotoStory(page, 'avatarimage--small-with-image')
    await expect(root).toHaveScreenshot('small-with-image.png')
  })

  test('small, without image, user initials', async ({ page }) => {
    const root = await gotoStory(page, 'avatarimage--small')
    await expect(root).toHaveScreenshot('small.png')
  })

  test('large, with image', async ({ page }) => {
    const root = await gotoStory(page, 'avatarimage--large-with-image')
    await expect(root).toHaveScreenshot('large-with-image.png')
  })

  test('large, without image, user initials', async ({ page }) => {
    const root = await gotoStory(page, 'avatarimage--large')
    await expect(root).toHaveScreenshot('large.png')
  })
})
