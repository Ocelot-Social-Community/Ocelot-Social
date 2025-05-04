import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I have the following self-description:', text => {
    // eslint-disable-next-line cypress/unsafe-to-chain-command
    cy.get('textarea[id=about]')
      .clear()
      .type(text)
    // eslint-disable-next-line cypress/unsafe-to-chain-command
    cy.get('[type=submit]')
      .click()
      .not('[disabled]')
    cy.get('.iziToast-message')
      .should('contain', 'Your data was successfully updated')
  })
