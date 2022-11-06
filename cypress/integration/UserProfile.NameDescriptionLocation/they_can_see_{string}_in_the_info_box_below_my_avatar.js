import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then('they can see {string} in the info box below my avatar', location => {
  cy.contains(location)
})
