import { When } from "@badeball/cypress-cucumber-preprocessor";

When('they can see the following text in the info box below my avatar:', text => {
  cy.contains(text)
})
