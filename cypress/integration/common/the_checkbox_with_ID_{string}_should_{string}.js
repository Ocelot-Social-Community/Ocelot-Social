import { When } from "cypress-cucumber-preprocessor/steps";

When("the checkbox with ID {string} should {string}", (id, value) => {
  cy.get('#' + id).should(value)
})
