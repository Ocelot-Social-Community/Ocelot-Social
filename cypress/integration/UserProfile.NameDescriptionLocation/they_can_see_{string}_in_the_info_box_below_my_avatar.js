import { Then } from "cypress-cucumber-preprocessor/steps";

Then('they can see {string} in the info box below my avatar', location => {
  cy.contains(location)
})