import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep("I see an avatar for the other user's message", () => {
  // Other user's messages are on the left side (no vac-offset-current class)
  // The avatar may be in light DOM (our ProfileAvatar slot) or shadow DOM (library default)
  cy.get('vue-advanced-chat', { timeout: 15000 }).then(($el) => {
    const shadow = $el[0].shadowRoot
    const messageWrappers = shadow.querySelectorAll('.vac-message-wrapper')
    const otherUserMsg = Array.from(messageWrappers).find(
      (el) => !el.querySelector('.vac-offset-current'),
    )
    expect(otherUserMsg).to.exist
    // Check for avatar in shadow DOM or light DOM slot content
    const hasAvatar =
      otherUserMsg.querySelector('.vac-avatar') ||
      $el.find('.profile-avatar.vac-message-avatar').length > 0
    expect(hasAvatar).to.be.ok
  })
})

defineStep('I see an avatar for my own message', () => {
  // Own messages are on the right side (vac-offset-current class)
  cy.get('vue-advanced-chat', { timeout: 15000 }).then(($el) => {
    const shadow = $el[0].shadowRoot
    const ownMsg = shadow.querySelector('.vac-offset-current')
    expect(ownMsg).to.exist
    // Check for avatar in shadow DOM or light DOM slot content
    const hasAvatar =
      shadow.querySelector('.vac-avatar-current') ||
      $el.find('.profile-avatar.vac-message-avatar').length > 0
    expect(hasAvatar).to.be.ok
  })
})
