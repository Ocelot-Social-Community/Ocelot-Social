import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I can see my new name {string} when I click on my profile picture in the top right', name => {
  // .main-navigation (holds .avatar-menu) is position:fixed but hides itself
  // via a scroll-direction-based transform (HeaderMenu.vue's handleScroll) —
  // it only reappears once an actual scroll-up is detected. Saving further
  // down a long page (e.g. Settings, with its map) leaves the page scrolled
  // there, with the header still transformed away. { ensureScrollable:
  // false } works around a Cypress scrollability pre-check false negative
  // on <window> (html/body use the browser default overflow: visible, not
  // auto/scroll, even though the root element is always natively
  // scrollable) — confirmed via a live scrollHeight/innerHeight check that
  // the page genuinely still had room to scroll here.
  cy.scrollTo('top', { ensureScrollable: false })
  cy.get('.avatar-menu').click() // open
  cy.get('.avatar-menu-popover').contains(name)
  cy.get('.avatar-menu').click() // close again
})
