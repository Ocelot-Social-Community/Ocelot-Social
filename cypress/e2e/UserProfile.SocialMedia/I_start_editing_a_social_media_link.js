import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I start editing a social media link', () => {
  cy.get(".base-button[title='Edit']")
    .click()
})
