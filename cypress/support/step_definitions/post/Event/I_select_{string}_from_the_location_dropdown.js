import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I select {string} from the location dropdown', (optionText) => {
  cy.get('.ds-select-option').contains(optionText).click()
})
