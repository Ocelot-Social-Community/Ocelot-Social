import { When } from "cypress-cucumber-preprocessor/steps";

When(`I click on {string}`, text => {
  cy.contains(text)
    .click()
});