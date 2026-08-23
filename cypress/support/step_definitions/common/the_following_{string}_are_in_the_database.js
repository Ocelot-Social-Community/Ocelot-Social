import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../factories'

// Every cell of a Gherkin table is a STRING, while the declaration in
// backend/src/db/schema types the properties — and db/testing/create.ts validates against it
// before writing, where neode used to coerce silently. So a boolean or a number column has to
// be parsed here, at the boundary where the feature text becomes fixture data.

/**
 * The two cell shapes the tables use, as parsers rather than JS coercions.
 *
 * `Boolean` and `Number` accept anything and answer silently: `Boolean('false')` is true and
 * `Number('')` is 0. Neither is visible in a diff of a feature file — a `false` in a pinned
 * column would read as pinned, and an empty `goal` would store 0 instead of leaving the
 * factory's default. Named values only, and a message for everything else.
 */
const flag = (value) => {
  if (value === '' || value === 'x') {
    return value === 'x'
  }
  throw new Error(
    `Expected "x" or an empty cell for a boolean column, got "${value}". ` +
      `The tables mark a flag with an x and leave it blank otherwise.`,
  )
}

const number = (value) => {
  // An empty cell means "whatever the factory says", not zero — returning undefined drops the
  // key so the default survives.
  if (value === '') {
    return undefined
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number, got "${value}".`)
  }
  return parsed
}

/**
 * Applies the parsers to the columns the table actually supplies.
 *
 * An absent column is left alone: parsing one would override the factory's own default, which
 * is what the row means to fall back to. A parser answering `undefined` says the same thing
 * for a cell that IS there but empty.
 *
 * The result has to go into BOTH slots of `Factory.build(attributes, options)`, never the raw
 * row into the second one. rosie resolves an attribute's declared dependencies from the
 * OPTIONS first (rosie.js `_attrValue`), and an attr that lists itself as a dependency — as
 * `.attr('pinned', ['pinned'], …)` does — always runs its builder, even when the attribute was
 * passed in. A raw `entry` in the options slot therefore wins over anything parsed here:
 *
 *   Factory.attributes('probe', { pinned: true }, { pinned: 'x' })  ->  { pinned: 'x' }
 */
const cast = (entry, coercions) => {
  const result = { ...entry }
  for (const [property, coerce] of Object.entries(coercions)) {
    if (entry[property] === undefined) {
      continue
    }
    const parsed = coerce(entry[property])
    if (parsed === undefined) {
      delete result[property]
      continue
    }
    result[property] = parsed
  }
  return result
}

defineStep('the following {string} are in the database:', (table,data) => {
  switch(table){
    case 'posts':
      data.hashes().forEach( entry => {
        // `pinned` is `true`-or-absent in the declaration, never false — the post factory
        // maps a falsy value onto null, and create.ts drops nulls before writing.
        const post = cast(entry, { deleted: flag, disabled: flag, pinned: flag })
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
        const group = cast(entry, { deleted: flag, disabled: flag })
        cy.factory().build('group', group, group)
      })
      break
    case 'donations':
      data.hashes().forEach( entry => {
        // `showDonations` is a boolean and `goal`/`progress` are numbers in the declaration;
        // the table writes them as "x" and "15000.0".
        const donations = cast(entry, {
          showDonations: flag,
          goal: number,
          progress: number,
        })
        cy.factory().build('donations', donations, donations)
      })
      break
  }
})
