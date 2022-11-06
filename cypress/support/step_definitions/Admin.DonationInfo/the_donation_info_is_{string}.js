import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("the donation info is {string}", (visibility) => {
  cy.get('.top-info-bar')
    .should(visibility === 'visible' ? 'exist' : 'not.exist')
})
