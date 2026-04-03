import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the API returns an authentication error', () => {
  cy.task('getValue', 'revokedApiKeyResponse').then((response) => {
    // currentUser should be null (unauthenticated) or return an error
    const hasError =
      (response.errors && response.errors.length > 0) ||
      (response.data && response.data.currentUser === null)
    expect(hasError).to.be.true
  })
})
