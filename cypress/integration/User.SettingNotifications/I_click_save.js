import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I click save", () => {
  cy.get(".save-button").click()
})