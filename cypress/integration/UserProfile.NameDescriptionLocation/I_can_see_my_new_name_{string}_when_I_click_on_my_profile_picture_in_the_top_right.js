import { Then } from "cypress-cucumber-preprocessor/steps";

Then('I can see my new name {string} when I click on my profile picture in the top right', name => {
  cy.get(".avatar-menu").then(($menu) => {
    if (!$menu.is(':visible')){
      cy.scrollTo("top");
      cy.wait(500);
    }
  })
  cy.get('.avatar-menu').click() // open
  cy.get('.avatar-menu-popover').contains(name)
  cy.get('.avatar-menu').click() // close again
})
