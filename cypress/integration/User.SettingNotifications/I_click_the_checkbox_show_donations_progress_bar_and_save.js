import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I click the checkbox show donations progress bar and save", () => {
  cy.get("#showDonations").click()
  cy.get(".donations-info-button").click()
})