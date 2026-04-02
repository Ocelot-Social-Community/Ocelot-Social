import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I generate a new invite code with comment {string}', (comment) => {
  cy.get('.create-invitation input').type(comment)
  cy.get('.generate-invite-code').click()
})
