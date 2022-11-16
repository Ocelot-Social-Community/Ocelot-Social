import { Then } from "cypress-cucumber-preprocessor/steps";

Then('I can see my new name {string} when I click on my profile picture in the top right', name => {
  cy.get('.avatar-menu').click() // open
  cy.get('.avatar-menu-popover').contains(name)
  cy.get('.avatar-menu').click() // close again
})