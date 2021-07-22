import { When } from "cypress-cucumber-preprocessor/steps";

When('they can see the following text in the info box below my avatar:', text => {
  cy.contains(text)
})