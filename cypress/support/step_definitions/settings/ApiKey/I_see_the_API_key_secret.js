import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the API key secret', () => {
  cy.get('.secret-code').should('be.visible').invoke('text').then((secret) => {
    const trimmed = secret.trim()
    expect(trimmed).to.match(/^oak_/)
    cy.task('pushValue', { name: 'apiKeySecret', value: trimmed })
  })
})
