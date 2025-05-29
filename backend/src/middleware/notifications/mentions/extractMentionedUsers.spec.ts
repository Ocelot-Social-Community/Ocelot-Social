import extractMentionedUsers from './extractMentionedUsers'

const contentWithMentions =
  '<p>Something inspirational about <a href="/profile/u2" class="not-a-mention" data-mention-id="bobs-id" target="_blank">@bob-der-baumeister</a> and <a href="/profile/u3/jenny-rostock" class="mention" data-mention-id="u3" target="_blank">@jenny-rostock</a>.</p>'
const contentEmptyMentions =
  '<p>Something inspirational about <a href="/profile/u2" data-mention-id="" target="_blank">@bob-der-baumeister</a> and <a href="/profile/u3/jenny-rostock" class="mention" data-mention-id target="_blank">@jenny-rostock</a>.</p>'
const contentWithPlainLinks =
  '<p>Something inspirational about <a class="mention" href="/profile/u2" target="_blank">@bob-der-baumeister</a> and <a href="/profile/u3" target="_blank">@jenny-rostock</a>.</p>'
const contentWithDuplicateIds =
  'One more mention to <a data-mention-id="you" class="mention" href="/profile/you"> @al-capone </a> and again: <a data-mention-id="you" class="mention" href="/profile/you"> @al-capone </a> and again <a data-mention-id="you" class="mention" href="/profile/you"> @al-capone </a>'

describe('extractMentionedUsers', () => {
  describe('content undefined', () => {
    it('returns empty array', () => {
      expect(extractMentionedUsers()).toEqual([])
    })
  })

  it('ignores links without .mention class', () => {
    expect(extractMentionedUsers(contentWithPlainLinks)).toEqual([])
  })

  it('removes duplicates', () => {
    expect(extractMentionedUsers(contentWithDuplicateIds)).toEqual(['you'])
  })

  describe('given a link with .mention class and `data-mention-id` attribute ', () => {
    it('extracts ids', () => {
      expect(extractMentionedUsers(contentWithMentions)).toEqual(['u3'])
    })

    it('ignores empty `data-mention-id` attributes', () => {
      expect(extractMentionedUsers(contentEmptyMentions)).toEqual([])
    })
  })
})
