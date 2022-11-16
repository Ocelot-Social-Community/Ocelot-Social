import { When } from "cypress-cucumber-preprocessor/steps";

When('I click on the author', () => {
  cy.get('[data-test="avatarUserLink"]')
    .click()
    .url().should('include', '/profile/')
})