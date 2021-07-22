import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the search should not contain posts by the annoying user", () => {
  cy.get(".searchable-input .ds-select-dropdown").should($li => {
    expect($li).to.have.length(1);
  })
  cy.get(".ds-select-dropdown")
    .should("not.have.class", '.search-post')
    .should("not.contain", 'Spam')
});