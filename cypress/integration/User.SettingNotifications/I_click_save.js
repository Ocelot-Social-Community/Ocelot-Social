import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I click save", () => {
  cy.get(".save-button").click()
})
