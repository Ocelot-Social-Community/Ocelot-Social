import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep("I see an avatar for the other user's message", () => {
  // Message avatars are slotted (light DOM), so query them directly on the host element
  cy.get('vue-advanced-chat .profile-avatar.vac-message-avatar', { timeout: 15000 })
    .should('have.length.gte', 1)
})

defineStep('I see an avatar for my own message', () => {
  // After sending a message, there should be at least 2 message avatars (other + own)
  cy.get('vue-advanced-chat .profile-avatar.vac-message-avatar', { timeout: 15000 })
    .should('have.length.gte', 2)
})
