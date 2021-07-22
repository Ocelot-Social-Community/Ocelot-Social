import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I should have one item in the select dropdown", () => {
  cy.get(".searchable-input .ds-select-dropdown").should($li => {
    expect($li).to.have.length(1);
  });
});