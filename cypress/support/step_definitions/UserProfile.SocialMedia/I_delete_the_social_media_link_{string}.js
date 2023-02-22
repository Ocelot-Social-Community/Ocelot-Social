import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I delete the social media link {string}', (link) => {
  cy.get('[data-test="delete-button"]')
    .click()
  cy.get('[data-test="confirm-modal"]')
    .should("be.visible")
  cy.get('[data-test="confirm-button"]')
    .click()
  cy.get('.ds-list-item-content > a')
    .contains(link).should('not.exist')
})
