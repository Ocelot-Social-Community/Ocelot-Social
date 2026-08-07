const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../../storybook/visual-test-helpers')

test.describe('FollowList visual regression', () => {
  test('without connections', async ({ page }) => {
    const root = await gotoStory(page, 'followlist--without-connections')
    await expect(root).toHaveScreenshot('without-connections.png')
  })

  test('with connections', async ({ page }) => {
    const root = await gotoStory(page, 'followlist--with-connections')
    await expect(root).toHaveScreenshot('with-connections.png')
  })

  test('with many connections (paginated, filterable)', async ({ page }) => {
    const root = await gotoStory(page, 'followlist--with-many-connections-paginated-filterable')
    await expect(root).toHaveScreenshot('with-many-connections-paginated-filterable.png')
  })
})
