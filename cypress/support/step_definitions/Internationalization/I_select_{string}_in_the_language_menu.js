import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I select {string} in the language menu', language => {
    cy.get('.locale-menu:visible')
      .first()
      .click()
    cy.contains('.locale-menu-popover a', language)
      .click()
})
