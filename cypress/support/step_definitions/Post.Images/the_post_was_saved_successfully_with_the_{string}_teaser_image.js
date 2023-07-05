import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("the post was saved successfully with the {string} teaser image", condition => {
  cy.get(".base-card > .title")
    .should("contain", condition === 'updated' ? 'to be updated' : 'new post')
    .get(".content")
    .should("contain", condition === 'updated' ? 'successfully updated' : 'new post content')
    .get('.post-page img')
    .should("have.attr", "src")
    .and("contains", condition === 'updated' ? 'humanconnection' : 'onourjourney')
})
