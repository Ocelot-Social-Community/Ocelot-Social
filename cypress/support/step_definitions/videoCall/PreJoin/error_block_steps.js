import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// LiveKit room.connect() against the synthetic wss://livekit.example.test URL
// takes a moment to time out — give Cypress room to wait for the phase change.
const ERROR_TIMEOUT = 60_000

defineStep('I see the video-call error block', () => {
  cy.get('[data-test="video-call-error"]', { timeout: ERROR_TIMEOUT }).should('be.visible')
})

defineStep('I see the retry button', () => {
  cy.get('[data-test="video-call-retry"]').should('be.visible')
})

defineStep('I see the back-to-pre-join button', () => {
  cy.get('[data-test="video-call-back-to-prejoin"]').should('be.visible')
})

defineStep('I click back-to-pre-join from the error block', () => {
  cy.get('[data-test="video-call-back-to-prejoin"]').click()
})
