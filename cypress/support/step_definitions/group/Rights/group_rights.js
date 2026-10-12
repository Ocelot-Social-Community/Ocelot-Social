import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// The rights page (/groups/edit/<id>/rights): the sentences first, the matrix of every right per
// role under them (data-test="perm-<key>", for the role whose tab is open — `usual` by default).
const right = (key) => cy.get(`[data-test="perm-${key}"]`)

defineStep('I open the detailed group rights', () => {
  cy.get('[data-test="rights-simple"]').should('be.visible')
  cy.get('[data-test="to-advanced"]').click()
  cy.get('[data-test="rights-advanced"]').should('be.visible')
})

defineStep('the group right {string} is ticked', (key) => {
  right(key).should('be.checked')
})

defineStep('the group right {string} is not ticked', (key) => {
  right(key).should('not.be.checked')
})

defineStep('I untick the group right {string}', (key) => {
  right(key).uncheck()
})

defineStep('I save the group rights', () => {
  cy.get('[data-test="save"]').click()
})

// Through the settings menu, so the router changes the page and the Apollo cache survives — a
// cy.visit() would load the app anew and start with an empty cache.
defineStep('I open the group settings tab {string}', (tab) => {
  cy.get(`.group-edit-layout__sidebar a[href$="/${tab}"]`).click()
  cy.location('pathname').should('match', new RegExp(`/${tab}$`))
})

// A mark on the window object: a full page load replaces the window and takes it along, so its
// survival proves the steps in between stayed inside the running app.
defineStep('I remember that the page has not been reloaded', () => {
  cy.window().then((win) => {
    win.e2eSamePage = true
  })
})

defineStep('the page has not been reloaded', () => {
  cy.window().its('e2eSamePage').should('equal', true)
})
