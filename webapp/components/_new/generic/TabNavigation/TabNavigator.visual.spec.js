const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../../../storybook/visual-test-helpers')

test.describe('TabNavigator visual regression', () => {
  test('given search results of posts, users, groups, hashtags', async ({ page }) => {
    const root = await gotoStory(
      page,
      'tabnavigator--given-search-results-of-posts-users-groups-hashtags',
    )
    await expect(root).toHaveScreenshot('given-search-results-of-posts-users-groups-hashtags.png')
  })
})
