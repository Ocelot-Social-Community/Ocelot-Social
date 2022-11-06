import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then('the old url is not displayed', () => {
  cy.get("a[href='https://freeradical.zone/peter-pan']")
    .should('have.length', 0)
})
  
