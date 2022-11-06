import { When } from "@badeball/cypress-cucumber-preprocessor";

When("the donation info contains goal {string} and progress {string}", (goal, progress) => {
  cy.get('.top-info-bar')
    .should('contain', goal)
  cy.get('.top-info-bar')
    .should('contain', progress)
});
