import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

const PREJOIN_ROOT = '.prejoin'

defineStep('I see the video-call pre-join dialog', () => {
  cy.get(PREJOIN_ROOT).should('be.visible')
})

defineStep('I no longer see the video-call pre-join dialog', () => {
  cy.get(PREJOIN_ROOT).should('not.exist')
})

defineStep('I cancel the video-call pre-join dialog', () => {
  cy.get('[data-test="prejoin-cancel"]').click()
})

defineStep('I confirm the video-call pre-join dialog', () => {
  cy.get('[data-test="prejoin-join"]').click()
})

defineStep('I toggle the pre-join microphone', () => {
  cy.get('[data-test="prejoin-mic-toggle"]').click()
})

defineStep('I toggle the pre-join camera', () => {
  cy.get('[data-test="prejoin-camera-toggle"]').click()
})

defineStep('the pre-join microphone is off', () => {
  // aria-pressed mirrors the active state — false means muted.
  cy.get('[data-test="prejoin-mic-toggle"]').should('have.attr', 'aria-pressed', 'false')
})

defineStep('the pre-join camera is off', () => {
  cy.get('[data-test="prejoin-camera-toggle"]').should('have.attr', 'aria-pressed', 'false')
})
