import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I can see my new name {string} when I click on my profile picture in the top right', name => {
  // The success toast (top-right, same corner as the avatar menu) can still
  // be showing right after a save — it only fades out after its own display
  // duration, not immediately once its text has been asserted on. Clicking
  // .avatar-menu while it's still up intercepts the click ("hidden from
  // view"). A no-op when there's no toast at all (e.g. the second call to
  // this step, after a page refresh).
  cy.get('.iziToast-message').should('not.exist')
  cy.get(".avatar-menu").then(($menu) => {
    if (!$menu.is(':visible')){
      cy.scrollTo("top")
      cy.wait(500)
    }
  })
  cy.get('.avatar-menu').click() // open
  cy.get('.avatar-menu-popover').contains(name)
  cy.get('.avatar-menu').click() // close again
})
