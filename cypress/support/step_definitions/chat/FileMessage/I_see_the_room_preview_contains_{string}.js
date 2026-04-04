import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the room preview contains {string}', (text) => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('.vac-room-item', { timeout: 10000 })
    .first()
    .should('contain', text)
})

defineStep('I see the room preview contains a microphone icon', () => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('.vac-room-item', { timeout: 10000 })
    .first()
    .find('.vac-icon-microphone, #vac-icon-microphone')
    .should('exist')
})
