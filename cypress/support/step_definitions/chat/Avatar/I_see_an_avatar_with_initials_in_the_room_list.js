import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see an avatar in the room list', () => {
  // Room list avatar slots are in the light DOM of vue-advanced-chat
  cy.get('vue-advanced-chat .profile-avatar', { timeout: 15000 })
    .first()
    .should('be.visible')
})
