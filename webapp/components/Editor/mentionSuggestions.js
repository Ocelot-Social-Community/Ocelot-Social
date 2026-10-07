import { mentionSuggestionsQuery } from '~/graphql/User'

// Loads the users to offer for an @-mention. The backend decides who is offered and in which
// order — see `mentionSuggestions` there; each user comes back with the `relation` it is listed
// under.
//
// 'no-cache': who follows whom, who commented and who was mentioned changes while the page is
// open, and the Editor keeps its own short-lived cache per typed query anyway.
export const fetchMentionSuggestions = async (apollo, { query, postId, groupId }) => {
  const { data } = await apollo.query({
    query: mentionSuggestionsQuery(),
    variables: { query, postId: postId || null, groupId: groupId || null },
    fetchPolicy: 'no-cache',
  })
  return data.mentionSuggestions.map(({ relation, user }) => ({ ...user, relation }))
}

// The backend's matching rule — start of the slug, or of any word of the name — for narrowing
// the list that is already on screen while the next answer is still on its way.
export const matchesMentionQuery = ({ slug, name }, query) => {
  const term = (query || '').trim().toLowerCase()
  if (!term) return true
  const lowerName = (name || '').toLowerCase()
  return (
    (slug || '').toLowerCase().startsWith(term) ||
    lowerName.startsWith(term) ||
    lowerName.includes(` ${term}`)
  )
}
