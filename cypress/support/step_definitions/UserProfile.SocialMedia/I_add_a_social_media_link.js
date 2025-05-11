import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I add a social media link', () => {
  const buttonSelector = 'button.--filled'
  cy.get(buttonSelector)
    .click()
    .get('#editSocialMedia')
    .type('https://freeradical.zone/peter-pan')
    .get(buttonSelector)
    .click()
})
