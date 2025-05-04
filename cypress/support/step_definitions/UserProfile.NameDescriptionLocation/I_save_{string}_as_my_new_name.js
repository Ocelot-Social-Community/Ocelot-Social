import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I save {string} as my new name', name => {
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.get('input[id=name]')
    .clear()
    .type(name)
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.get('[type=submit]')
    .click()
    .not('[disabled]')
  cy.get('.iziToast-message')
    .should('contain', 'Your data was successfully updated')
})
