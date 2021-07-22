import { Then } from "cypress-cucumber-preprocessor/steps";

Then('the new url is displayed', () => {
  cy.get("a[href='https://freeradical.zone/tinkerbell']")
    .should('have.length', 1)
})