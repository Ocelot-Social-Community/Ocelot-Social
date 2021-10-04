import { When } from "cypress-cucumber-preprocessor/steps";

When("I click on element with ID {string}", (id) => {
  cy.get('#' + id).click()
})
