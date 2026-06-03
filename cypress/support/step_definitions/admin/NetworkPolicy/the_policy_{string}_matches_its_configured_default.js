import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// After a reset the checkbox state must equal the configured default, whatever
// that default is for this deployment. We read it off the grey "(default: …)"
// hint next to the key rather than hard-coding true/false, so the assertion
// holds regardless of the backend's ENV seed.
defineStep('the policy {string} matches its configured default', (key) => {
  cy.get(`[data-test="policy-default-${key}"]`)
    .invoke('text')
    .then((text) => {
      const defaultIsTrue = /true/i.test(text)
      cy.get(`[data-test="policy-${key}"]`).should(
        defaultIsTrue ? 'be.checked' : 'not.be.checked',
      )
    })
})
