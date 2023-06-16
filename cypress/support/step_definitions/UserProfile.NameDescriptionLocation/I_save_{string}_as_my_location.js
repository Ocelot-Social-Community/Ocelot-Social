import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I save {string} as my location', location => {
    cy.get('input[id=city]').type(location)
    cy.get('.ds-select-option')
      .contains(location)
      .click()
    cy.get('[type=submit]')
      .click()
      .not('[disabled]')
    cy.get('.iziToast-message')
      .should('contain', 'Your data was successfully updated')
  })
