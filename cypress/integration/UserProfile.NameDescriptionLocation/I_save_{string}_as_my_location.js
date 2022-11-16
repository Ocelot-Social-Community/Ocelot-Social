import { When } from "cypress-cucumber-preprocessor/steps";

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