const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../../storybook/visual-test-helpers')

test.describe('ReportsTable visual regression', () => {
  test('with reports', async ({ page }) => {
    const root = await gotoStory(page, 'reportstable--with-reports')
    await expect(root).toHaveScreenshot('with-reports.png')
  })

  test('without reports', async ({ page }) => {
    const root = await gotoStory(page, 'reportstable--without-reports')
    await expect(root).toHaveScreenshot('without-reports.png')
  })
})
