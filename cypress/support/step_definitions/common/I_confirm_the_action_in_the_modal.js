import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I confirm the action in the modal', () => {
  // Assert on the PANEL, not on the modal's root wrapper. That wrapper contains only the backdrop
  // and the overlay, both `position: fixed` and therefore out of flow, so it is 0 pixels high
  // whether the modal is open or not. Cypress 15 called it visible anyway; the modern visibility
  // algorithm that Cypress 16 made the default drops that allowance for fixed/sticky descendants.
  // The panel is also the more truthful target: OsModal renders the wrapper even when closed
  // (packages/ui/src/components/OsModal/OsModal.vue), the panel only when it is open.
  //
  // Matched by CLASS, not by the `data-testid` the source puts on that node: the webapp runs the
  // library under Vue 2, where h() only understands a fixed set of top-level data keys and silently
  // drops everything else. The panel's props are passed flat, so `data-testid`, `role="dialog"` and
  // `aria-modal` never reach the DOM here — `class` survives only because it is one of those keys.
  cy.get('[data-test="confirm-modal"]').find('.os-modal').should('be.visible')
  cy.get('[data-test="confirm-button"]').click()
})
