import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Clicks the article/event entry in the post-create sidebar menu.
// Matches by locale-independent URL target because the button label is i18n.
defineStep('I switch the post type to {string}', (type) => {
  cy.get(`.os-menu-item-link[href*="/post/create/${type}"]`, { timeout: 10000 }).click()
  cy.location('pathname').should('match', new RegExp(`/post/create/${type}`))
})
