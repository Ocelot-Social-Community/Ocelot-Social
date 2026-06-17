import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see a toaster with status {string}', (status) => {
  switch (status) {
    case 'success':
      cy.get('.iziToast.iziToast-color-green').should('be.visible')
      break
    case 'error':
      cy.get('.iziToast.iziToast-color-red').should('be.visible')
      break
  }
})
