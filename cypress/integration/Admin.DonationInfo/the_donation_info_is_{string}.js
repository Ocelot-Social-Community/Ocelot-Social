import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the donation info is {string}", (visibility) => {
  cy.get('.top-info-bar')
    .should(visibility === 'visible' ? 'exist' : 'not.exist')
})