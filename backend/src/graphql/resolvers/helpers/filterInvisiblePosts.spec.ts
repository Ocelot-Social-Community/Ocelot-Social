import { describe, expect, it } from 'vitest'

import { filterInvisiblePosts } from './filterInvisiblePosts'

import type { ViewerScope } from './viewerGroups'

const elevatedIn = (...elevatedGroupIds: string[]): ViewerScope => ({
  viewerId: 'admin',
  contentGroupIds: ['mine'],
  elevatedGroupIds,
})

const elevatedPassedOn = (
  params: Parameters<typeof filterInvisiblePosts>[0],
  viewer: ViewerScope,
) => (filterInvisiblePosts(params, viewer).filter?.invisibleTo as ViewerScope).elevatedGroupIds

// An elevation is asked for to look inside ONE group. Which requests may use it decides whether a
// network admin's feed carries the content of the groups they elevated in (#10506).
describe(filterInvisiblePosts, () => {
  it('keeps the viewer and their own groups as they are', () => {
    const { filter } = filterInvisiblePosts({ filter: { language: 'de' } }, elevatedIn('g1'))

    expect(filter).toEqual({
      language: 'de',
      invisibleTo: { viewerId: 'admin', contentGroupIds: ['mine'], elevatedGroupIds: [] },
    })
  })

  it('passes no elevation on to a feed, even while it lasts', () => {
    expect(elevatedPassedOn({}, elevatedIn('g1', 'g2'))).toEqual([])
    expect(elevatedPassedOn({ filter: { postsInMyGroups: true } }, elevatedIn('g1'))).toEqual([])
  })

  it('passes on the one group a request names, if the viewer elevated there', () => {
    expect(elevatedPassedOn({ filter: { group: { id: 'g2' } } }, elevatedIn('g1', 'g2'))).toEqual([
      'g2',
    ])
    expect(elevatedPassedOn({ filter: { group: { id: 'g3' } } }, elevatedIn('g1', 'g2'))).toEqual(
      [],
    )
  })

  it('does not read a list of groups as naming one', () => {
    expect(elevatedPassedOn({ filter: { group: { id_in: ['g1'] } } }, elevatedIn('g1'))).toEqual([])
  })

  it('passes the elevations on to a request for one post, whose own group still has to match', () => {
    // The post page. Which group the post is in is the graph's answer, so all elevated ids go
    // along and `invisibleTo` checks the post's group against them.
    expect(elevatedPassedOn({ id: 'p1' }, elevatedIn('g1'))).toEqual(['g1'])
    expect(elevatedPassedOn({ slug: 'a-post' }, elevatedIn('g1'))).toEqual(['g1'])
    expect(elevatedPassedOn({ filter: { id: 'p1' } }, elevatedIn('g1'))).toEqual(['g1'])
    expect(elevatedPassedOn({ filter: { slug: 'a-post' } }, elevatedIn('g1'))).toEqual(['g1'])
  })

  it('does not read an absent id as naming a post', () => {
    expect(elevatedPassedOn({ filter: { id: null, slug: undefined } }, elevatedIn('g1'))).toEqual(
      [],
    )
  })
})
