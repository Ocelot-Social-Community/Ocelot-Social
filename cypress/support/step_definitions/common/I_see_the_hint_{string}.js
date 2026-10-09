import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// A validation hint under a form field (OsValidationHint, role="alert") — not a toast.
defineStep('I see the hint {string}', (text) => {
  cy.contains('.os-validation-hint[role="alert"]', text)
})
