import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../factories'

/**
 * A flag column, where these tables write `x` for true and leave the cell empty for false.
 *
 * `Boolean(cell)` agreed with that convention by accident rather than by rule: a gherkin cell is
 * always a string, and `Boolean` turns "false" and "0" into TRUE. A table that spelled a flag out
 * would have built the opposite fixture without saying so — and a silently wrong fixture is worse
 * than a broken one, because the scenario still runs and asserts against it.
 *
 * An unrecognised value is refused rather than guessed, so `X` or `yes` fails the scenario where
 * it was written instead of quietly setting the flag.
 */
const flag = (value, column) => {
  if (value === undefined || value === '') {
    return false
  }
  if (value === 'x') {
    return true
  }
  throw new Error(
    `The "${column}" column takes "x" for true or an empty cell for false, ` +
      `not ${JSON.stringify(value)}.`,
  )
}

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
          deleted: flag(entry.deleted, 'deleted'),
          disabled: flag(entry.disabled, 'disabled'),
          pinned: flag(entry.pinned, 'pinned'),
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
          deleted: flag(entry.deleted, 'deleted'),
          disabled: flag(entry.disabled, 'disabled'),
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
          showDonations: flag(entry.showDonations, 'showDonations'),
          goal: Number(entry.goal),
          progress: Number(entry.progress),
        }
        cy.factory().build('donations', attributes, attributes)
      })
      break
  }
})
