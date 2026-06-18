import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see a toaster with status {string}', (status) => {
  switch (status) {
    case 'success':
      cy.get('.iziToast.iziToast-color-green').should('be.visible')
      break
    case 'error':
      cy.get('.iziToast.iziToast-color-red').should('be.visible')
      break
    default:
      // The step *is* the assertion: an unknown status (typo in the feature file or an
      // unsupported value) must fail loudly instead of passing with no check at all.
      throw new Error(
        `Unknown toaster status "${status}"; expected "success" or "error".`,
      )
  }
})
