import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I save {string} as my new name', name => {
  cy.get('input[id=name]')
    .clear()
    .type(name)
  cy.get('[type=submit]')
    .click()
    .not('[disabled]')
  cy.get('.iziToast-message')
    .should('contain', 'Your data was successfully updated')
})
