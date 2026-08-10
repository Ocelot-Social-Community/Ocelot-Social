const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../../storybook/visual-test-helpers')

test.describe('FiledReportsTable visual regression', () => {
  test('with filed reports', async ({ page }) => {
    const root = await gotoStory(page, 'filedreportstable--with-filed-reports')
    await expect(root).toHaveScreenshot('with-filed-reports.png')
  })
})
