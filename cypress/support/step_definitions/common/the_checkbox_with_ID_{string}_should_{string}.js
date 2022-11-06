import { When } from "@badeball/cypress-cucumber-preprocessor";

When("the checkbox with ID {string} should {string}", (id, value) => {
  cy.get('#' + id).should(value)
})
