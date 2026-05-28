import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the video call button is visible', () => {
  cy.get('[data-test="video-call-btn"]').should('be.visible')
})

defineStep('the video call button is not visible', () => {
  cy.get('[data-test="video-call-btn"]').should('not.exist')
})

defineStep('I click on the video-call button', () => {
  cy.get('[data-test="video-call-btn"]').click()
})
