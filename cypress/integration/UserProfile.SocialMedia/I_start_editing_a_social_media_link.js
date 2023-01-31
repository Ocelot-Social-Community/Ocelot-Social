import { When } from "cypress-cucumber-preprocessor/steps";

When('I start editing a social media link', () => {
  cy.get('[data-test="edit-button"]')
    .click()
})