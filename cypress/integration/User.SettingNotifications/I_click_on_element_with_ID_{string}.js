import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I click on element with ID {string}", (id) => {
  cy.get('#' + id).click()
})
