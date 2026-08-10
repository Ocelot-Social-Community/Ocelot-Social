const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../../storybook/visual-test-helpers')

test.describe('SearchableInput visual regression', () => {
  test('default search input state', async ({ page }) => {
    const root = await gotoStory(page, 'searchableinput--test')
    await expect(root).toHaveScreenshot('default-search-input.png')
  })
})
