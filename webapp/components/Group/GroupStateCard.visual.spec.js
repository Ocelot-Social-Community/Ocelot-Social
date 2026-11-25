const { test, expect } = require('@playwright/test')
const { gotoStory } = require('../../storybook/visual-test-helpers')

test.describe('GroupStateCard visual regression', () => {
  test('template cards: picked, pickable and refused', async ({ page }) => {
    const root = await gotoStory(page, 'groupstatecard--template-cards')
    await expect(root).toHaveScreenshot('template-cards.png')
  })
})
