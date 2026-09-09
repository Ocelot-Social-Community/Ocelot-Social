import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I delete the social media link {string}', (link) => {
  cy.get('[data-test="delete-button"]')
    .click()
  // The panel rather than the wrapper — see I_confirm_the_action_in_the_modal.js for why the
  // wrapper is 0 pixels high and stopped counting as visible in Cypress 16.
  cy.get('[data-test="confirm-modal"]')
    .find('[data-testid="os-modal-panel"]')
    .should("be.visible")
  cy.get('[data-test="confirm-button"]')
    .click()
  cy.get(`.ds-list-item a[href="${link}"]`)
    .should('not.exist')
})
