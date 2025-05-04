import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('mention {string} in the text', mention => {
  cy.get('.ProseMirror')
    .type(' @')
  cy.get('.suggestion-list__item')
    .contains(mention)
    .click()
})
