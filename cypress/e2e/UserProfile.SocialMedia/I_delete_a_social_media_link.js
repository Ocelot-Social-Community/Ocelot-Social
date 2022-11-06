import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I delete a social media link', () => {
  cy.get(".base-button[title='Delete']")
    .click()
})
