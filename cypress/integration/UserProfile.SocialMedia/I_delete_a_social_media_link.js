import { When } from "cypress-cucumber-preprocessor/steps";

When('I delete a social media link', () => {
  cy.get(".base-button[title='Delete']")
    .click()
  // Wolle: add delition confirmation modal click
})