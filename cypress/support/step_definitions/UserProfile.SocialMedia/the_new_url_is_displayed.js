import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the new url is displayed', () => {
  cy.get("a[href='https://freeradical.zone/tinkerbell']")
    .should('have.length', 1)
})
