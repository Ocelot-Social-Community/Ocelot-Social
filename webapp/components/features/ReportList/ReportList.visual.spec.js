const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../../storybook/visual-test-helpers')

test.describe('ReportList visual regression', () => {
  test('with reports', async ({ page }) => {
    const root = await gotoStory(page, 'reportlist--with-reports')
    await expect(root).toHaveScreenshot('with-reports.png')
  })
})
