import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I click the checkbox show donations progress bar and save", () => {
  cy.get("#showDonations").click()
  cy.get(".donations-info-button").click()
})
