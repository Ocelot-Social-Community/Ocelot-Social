import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then('the new url is displayed', () => {
  cy.get("a[href='https://freeradical.zone/tinkerbell']")
    .should('have.length', 1)
})
