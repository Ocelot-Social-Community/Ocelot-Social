const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('DropdownFilter visual regression', () => {
  test('filter dropdown', async ({ page }) => {
    const root = await gotoStory(page, 'dropdownfilter--filter-dropdown')
    await expect(root).toHaveScreenshot('filter-dropdown.png')
  })
})
