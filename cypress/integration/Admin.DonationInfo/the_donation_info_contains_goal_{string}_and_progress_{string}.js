import { When } from "cypress-cucumber-preprocessor/steps";

When("the donation info contains goal {string} and progress {string}", (goal, progress) => {
  cy.get('.top-info-bar')
    .should('contain', goal)
  cy.get('.top-info-bar')
    .should('contain', progress)
});