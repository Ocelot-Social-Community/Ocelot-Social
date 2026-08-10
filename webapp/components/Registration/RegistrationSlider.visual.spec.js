const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('RegistrationSlider visual regression', () => {
  test('invite code, empty', async ({ page }) => {
    const root = await gotoStory(page, 'registrationslider--invite-code-empty')
    await expect(root).toHaveScreenshot('invite-code-empty.png')
  })

  test('invite code, with data', async ({ page }) => {
    const root = await gotoStory(page, 'registrationslider--invite-code-with-data')
    await expect(root).toHaveScreenshot('invite-code-with-data.png')
  })

  test('public registration, empty', async ({ page }) => {
    const root = await gotoStory(page, 'registrationslider--public-registration-empty')
    await expect(root).toHaveScreenshot('public-registration-empty.png')
  })

  test('public registration, with data', async ({ page }) => {
    const root = await gotoStory(page, 'registrationslider--public-registration-with-data')
    await expect(root).toHaveScreenshot('public-registration-with-data.png')
  })

  test('invite mail, empty', async ({ page }) => {
    const root = await gotoStory(page, 'registrationslider--invite-mail-empty')
    await expect(root).toHaveScreenshot('invite-mail-empty.png')
  })

  test('invite mail, with data', async ({ page }) => {
    const root = await gotoStory(page, 'registrationslider--invite-mail-with-data')
    await expect(root).toHaveScreenshot('invite-mail-with-data.png')
  })

  test('no public registration', async ({ page }) => {
    const root = await gotoStory(page, 'registrationslider--no-public-registration')
    await expect(root).toHaveScreenshot('no-public-registration.png')
  })
})
