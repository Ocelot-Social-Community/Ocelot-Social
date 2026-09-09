import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I confirm the action in the modal', () => {
  // Assert on the PANEL, not on the modal's root wrapper. That wrapper contains only the backdrop
  // and the overlay, both `position: fixed` and therefore out of flow, so it is 0 pixels high
  // whether the modal is open or not. Cypress 15 called it visible anyway; the modern visibility
  // algorithm that Cypress 16 made the default drops that allowance for fixed/sticky descendants.
  // The panel is also the more truthful target: OsModal renders the wrapper even when closed
  // (packages/ui/src/components/OsModal/OsModal.vue), the panel only when it is open.
  cy.get('[data-test="confirm-modal"]').find('[data-testid="os-modal-panel"]').should('be.visible')
  cy.get('[data-test="confirm-button"]').click()
})
