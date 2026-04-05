import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep("I see an avatar for the other user's message", () => {
  // Other user's messages are on the left side (no vac-offset-current class)
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('.vac-message-wrapper:not(:has(.vac-offset-current))', { timeout: 10000 })
    .first()
    .find('.vac-avatar, .profile-avatar.vac-message-avatar')
    .should('exist')
})

defineStep('I see an avatar for my own message', () => {
  // Own messages are on the right side (vac-offset-current class)
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('.vac-message-wrapper:has(.vac-offset-current)', { timeout: 10000 })
    .first()
    .find('.vac-avatar-current, .profile-avatar.vac-message-avatar')
    .should('exist')
})
