import { describe, expect, it } from 'vitest'

import { maskUnreadableGroupContent } from './reports'

import type { PermissionKey } from '@src/permission'

// What the moderation queue hands the UI for a report whose subject sits in a group this
// moderator may not read. Reporting content used to be the way to READ it: the queue returned
// `resource {.*}` with no group filtering at all, so a moderator saw the inside of a closed
// group here while the same post was invisible to them everywhere else (#9405).
const holding = (...permissions: string[]) => new Set(permissions as PermissionKey[])

const reportOf = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  filed: [{ reasonCategory: 'other' }],
  reviewed: [],
  resource: {
    __typename: 'Post',
    id: 'p1',
    title: 'A title',
    content: 'The content',
    contentExcerpt: 'The exc…',
    image: { url: 'https://example.test/i.png' },
    post: null,
    author: { id: 'author' },
  },
  groupType: null,
  readableHere: false,
  ...overrides,
})

describe(maskUnreadableGroupContent, () => {
  it('leaves a report about something outside any group alone', () => {
    // A reported user, or a post that is in no group: there is nothing to mask.
    const masked = maskUnreadableGroupContent(reportOf(), holding())

    expect(masked.resourceHidden).toBe(false)
    expect(masked.resource).toMatchObject({ title: 'A title', content: 'The content' })
  })

  it('leaves it alone when the group itself opened its content', () => {
    // `readableHere` is the group's own answer, computed in the query: it opened its content to
    // non-members, or this moderator's role in it grants reading.
    const masked = maskUnreadableGroupContent(
      reportOf({ groupType: 'closed', readableHere: true }),
      holding(),
    )

    expect(masked.resourceHidden).toBe(false)
    expect(masked.resource).toMatchObject({ title: 'A title' })
  })

  it('leaves it alone for a moderator who may read into that group type', () => {
    const masked = maskUnreadableGroupContent(
      reportOf({ groupType: 'closed' }),
      holding('group.content.read.any_closed'),
    )

    expect(masked.resourceHidden).toBe(false)
  })

  it('does not let the right for one type open another', () => {
    // Two separate rights, because an unlisted group is the stricter case.
    const masked = maskUnreadableGroupContent(
      reportOf({ groupType: 'hidden' }),
      holding('group.content.read.any_closed'),
    )

    expect(masked.resourceHidden).toBe(true)
  })

  it('blanks the content but keeps what the report is', () => {
    // The metadata stays so the report can be escalated by somebody who may read the group —
    // and `resourceHidden` is what lets the UI say why instead of rendering an empty link.
    const masked = maskUnreadableGroupContent(reportOf({ groupType: 'closed' }), holding())

    expect(masked).toMatchObject({
      id: 'r1',
      resourceHidden: true,
      filed: [{ reasonCategory: 'other' }],
    })
    expect(masked.resource).toMatchObject({
      __typename: 'Post',
      id: 'p1',
      title: null,
      content: null,
      contentExcerpt: null,
      image: null,
      post: null,
      author: { id: 'author' },
    })
  })

  it('blanks a public group that closed its content, too', () => {
    // `groupType = 'public'` is deliberately not a shortcut any more: what the group decided
    // is what counts, and the queue is not a way around it.
    const masked = maskUnreadableGroupContent(
      reportOf({ groupType: 'public', readableHere: false }),
      holding(),
    )

    expect(masked.resourceHidden).toBe(true)
  })

  it('survives a report row with no resource at all', () => {
    const masked = maskUnreadableGroupContent(
      reportOf({ groupType: 'closed', resource: null }),
      holding(),
    )

    expect(masked).toMatchObject({ resourceHidden: true, resource: null })
  })
})
