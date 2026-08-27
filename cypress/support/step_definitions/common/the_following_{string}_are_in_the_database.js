import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../factories'

defineStep('the following {string} are in the database:', (table,data) => {
  switch(table){
    case 'posts':
      data.hashes().forEach( entry => {
        // The SAME object into both arguments. A gherkin cell is always a string, and the
        // factory reads a dependent attribute from the options when the key is in there —
        // so spreading the raw row into the options put `pinned: 'x'` back over the
        // `pinned: true` next to it, and the declaration rejected a string.
        const attributes = {
          ...entry,
          deleted: Boolean(entry.deleted),
          disabled: Boolean(entry.disabled),
          pinned: Boolean(entry.pinned),
        }
        cy.factory().build('post', attributes, {
          ...attributes,
          tagIds: entry.tagIds ? entry.tagIds.split(',').map(item => item.trim()) : [],
        })
      })
      break
    case 'comments':
      data.hashes().forEach( entry => {
        cy.factory()
          .build('comment', entry, entry)
      })
      break
    case 'users':
      data.hashes().forEach( entry => {
        if (entry.slug && entry.password) {
          const passwords = Cypress.env('userPasswords') || {}
          passwords[entry.slug] = entry.password
          Cypress.env('userPasswords', passwords)
        }
        cy.factory().build('user', entry, entry)
      })
      break
    case 'tags':
      data.hashes().forEach( entry => {
        cy.factory().build('tag', entry, entry)
      })
      break
    case 'groups':
      data.hashes().forEach( entry => {
        const attributes = {
          ...entry,
          deleted: Boolean(entry.deleted),
          disabled: Boolean(entry.disabled),
        }
        cy.factory().build('group', attributes, attributes)
      })
      break
    case 'donations':
      data.hashes().forEach( entry => {
        // Numbers and a flag, which a gherkin cell cannot carry: `goal` is declared as a
        // number and `showDonations` as a boolean, and the row hands over "15000.0" and "x".
        const attributes = {
          ...entry,
          showDonations: Boolean(entry.showDonations),
          goal: Number(entry.goal),
          progress: Number(entry.progress),
        }
        cy.factory().build('donations', attributes, attributes)
      })
      break
  }
})
