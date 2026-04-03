import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the API returns my user name {string}', (expectedName) => {
  cy.task('getValue', 'apiKeyResponse').then((response) => {
    expect(response.currentUser.name).to.equal(expectedName)
  })
})
