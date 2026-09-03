import { describe, expect, it } from 'vitest'

import { isReversible } from '@db/migrations/20260820140000-drop-article-secondary-label-constraints'

import type { PresentConstraint } from '@db/migrations/20260820140000-drop-article-secondary-label-constraints'

// Which constraints this migration may drop. `up` deletes what this accepts and `down` recreates
// the uniqueness constraints on Article(id) and Article(slug) — so what it accepts and what
// `down` rebuilds have to be the same set, or the migration destroys more than it restores while
// presenting itself as reversible.
//
// Not beside its subject for the reason the sibling spec gives: node-migrate requires every entry
// of --migrations-dir, and a spec in there kills `db:migrate up`.

const constraint = (over: Partial<PresentConstraint> = {}): PresentConstraint => ({
  labelsOrTypes: ['Article'],
  type: 'UNIQUENESS',
  properties: ['id'],
  ...over,
})

describe(isReversible, () => {
  it.each([['id'], ['slug']])('accepts the uniqueness constraint on Article(%s)', (property) => {
    // The closed set neode's `extend('Post', 'Article')` produced: Post's `id: primary` and
    // `slug: unique`, copied onto the secondary label.
    expect(isReversible(constraint({ properties: [property] }))).toBe(true)
  })

  it('leaves an existence constraint alone, which `down` could not rebuild', () => {
    expect(isReversible(constraint({ type: 'NODE_PROPERTY_EXISTENCE' }))).toBe(false)
  })

  it('leaves a uniqueness constraint over another property alone', () => {
    expect(isReversible(constraint({ properties: ['title'] }))).toBe(false)
  })

  it('leaves a composite constraint alone, even over the two named properties', () => {
    // `(a.id, a.slug) IS NODE KEY` is not two constraints, and `down` writes two single ones.
    expect(isReversible(constraint({ properties: ['id', 'slug'] }))).toBe(false)
  })

  it.each([
    ['a different label', { labelsOrTypes: ['Post'] }],
    ['Article as one of several', { labelsOrTypes: ['Post', 'Article'] }],
    ['no label at all', { labelsOrTypes: null }],
  ])('leaves a constraint on %s alone', (_case, over) => {
    // The point of the migration is the SECONDARY label. Post(id) and Post(slug) are what keep
    // the data unique and must survive.
    expect(isReversible(constraint(over))).toBe(false)
  })

  it('leaves a constraint whose properties are unknown alone', () => {
    expect(isReversible(constraint({ properties: null }))).toBe(false)
  })
})
