import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I switch off the e-mails for {string}', (label) => {
  cy.contains('label', label)
    .invoke('attr', 'for')
    .then((id) => {
      cy.get(`input#${id}`).should('be.checked').uncheck()
    })
})

defineStep('I save the notification settings', () => {
  cy.get('.save-button').click()
})
