import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../factories'

// Every cell of a Gherkin table is a STRING, while the declaration in
// backend/src/db/schema types the properties — and db/testing/create.ts validates against it
// before writing, where neode used to coerce silently. So a boolean or a number column has to
// be cast here, at the boundary where the feature text becomes fixture data.
//
// Only columns the table actually supplies are cast: casting an absent one would turn it into
// `false`/`NaN` and override the factory's own default, which is what the row means to fall
// back to.
//
// The result has to go into BOTH slots of Factory.build(attributes, options), never the raw
// row into the second one. rosie resolves an attribute's declared dependencies from the
// OPTIONS first (rosie.js `_attrValue`), and an attr that lists itself as a dependency — as
// `.attr('pinned', ['pinned'], …)` does — always runs its builder, even when the attribute was
// passed in. A raw `entry` in the options slot therefore wins over anything cast here:
//
//   Factory.attributes('probe', { pinned: true }, { pinned: 'x' })  ->  { pinned: 'x' }
const cast = (entry, coercions) => {
  const result = { ...entry }
  for (const [property, coerce] of Object.entries(coercions)) {
    if (entry[property] !== undefined) {
      result[property] = coerce(entry[property])
    }
  }
  return result
}

defineStep('the following {string} are in the database:', (table,data) => {
  switch(table){
    case 'posts':
      data.hashes().forEach( entry => {
        // `pinned` is `true`-or-absent in the declaration, never false — the post factory
        // maps a falsy value onto null, and create.ts drops nulls before writing.
        const post = cast(entry, {
          deleted: Boolean,
          disabled: Boolean,
          pinned: Boolean,
        })
        cy.factory().build('post', post, {
          ...post,
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
        const group = cast(entry, { deleted: Boolean, disabled: Boolean })
        cy.factory().build('group', group, group)
      })
      break
    case 'donations':
      data.hashes().forEach( entry => {
        // `showDonations` is a boolean and `goal`/`progress` are numbers in the declaration;
        // the table writes them as "x" and "15000.0".
        const donations = cast(entry, {
          showDonations: Boolean,
          goal: Number,
          progress: Number,
        })
        cy.factory().build('donations', donations, donations)
      })
      break
  }
})
