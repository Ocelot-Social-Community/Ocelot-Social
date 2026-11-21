import { describe, expect, it } from 'vitest'
import { Comment, Fragment, Text, h } from 'vue'

import { shownNodes } from './slotContent'

describe(shownNodes, () => {
  it('drops what a false v-if and the line breaks around it leave behind', () => {
    expect(shownNodes([h(Comment, 'v-if'), h(Text, '\n  '), h(Comment, 'v-if')])).toStrictEqual([])
  })

  it('keeps elements, components and text that says something', () => {
    const nodes = [h('svg'), h(Fragment, []), h(Text, 'Save')]

    expect(shownNodes(nodes)).toStrictEqual(nodes)
  })

  // Blank means nothing but whitespace — not merely padded: a label with spaces around it shows.
  it('keeps text padded with whitespace', () => {
    const padded = h(Text, ' Save ')

    expect(shownNodes([padded])).toStrictEqual([padded])
  })

  it('answers an absent slot with an empty list', () => {
    expect(shownNodes(undefined)).toStrictEqual([])
    expect(shownNodes(null)).toStrictEqual([])
  })
})
