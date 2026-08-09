const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../../../storybook/visual-test-helpers')

test.describe('PaginationButtons visual regression', () => {
  test('basic pagination', async ({ page }) => {
    const root = await gotoStory(page, 'paginationbuttons--basic-pagination')
    await expect(root).toHaveScreenshot('basic-pagination.png')
  })
})
