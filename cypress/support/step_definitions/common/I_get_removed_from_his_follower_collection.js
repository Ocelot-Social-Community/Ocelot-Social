import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I get removed from his follower collection', () => {
  cy.contains('.infinite-scroll-list .nobody-message', 'is not followed by anyone').should(
    'be.visible',
  )
})
