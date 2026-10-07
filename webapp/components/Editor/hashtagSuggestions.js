import { hashtagSuggestionsQuery } from '~/graphql/Tag'

// The list scrolls, so it may hold more than fits on screen.
const HASHTAG_SUGGESTIONS_LIMIT = 20

// Loads the hashtags to offer while typing one. The backend decides which are offered and in
// which order — see `hashtagSuggestions` there; each tag comes back with the `relation` it is
// listed under.
//
// 'no-cache': tags come and go with every post, and the Editor keeps its own short-lived cache
// per typed query anyway.
export const fetchHashtagSuggestions = async (apollo, { query }) => {
  const { data } = await apollo.query({
    query: hashtagSuggestionsQuery(),
    variables: { query, first: HASHTAG_SUGGESTIONS_LIMIT },
    fetchPolicy: 'no-cache',
  })
  return data.hashtagSuggestions.map(({ relation, tag }) => ({ ...tag, relation }))
}

// The relation of the entry that creates the typed tag — see withNewHashtag.
export const NEW_HASHTAG = 'new'

// The backend's matching rule — start of the tag — for narrowing the list that is already on
// screen while the next answer is still on its way. The entry for a new tag never survives that:
// it stands for what was typed BEFORE, and Enter would create exactly that.
export const matchesHashtagQuery = ({ id, relation }, query) =>
  relation !== NEW_HASHTAG &&
  (id || '').toLowerCase().startsWith((query || '').trim().toLowerCase())

// Appends the typed tag as an entry of its own when it does not exist yet. An entry like any
// other — and not a row the list paints on its own account — so that the arrow keys reach it and
// Enter creates the tag.
export const withNewHashtag = (items, query) => {
  if (!query || items.some(({ id }) => id === query)) return items
  return [...items, { id: query, relation: NEW_HASHTAG }]
}
