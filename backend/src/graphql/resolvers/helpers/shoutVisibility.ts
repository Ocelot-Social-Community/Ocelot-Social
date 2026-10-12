/**
 * Whose shouts a viewer may see, as a Cypher condition: the shouter's own, or anybody's who
 * shows them (`showShoutsPublicly`). Public is the default — a user switches it off, and an
 * unset property counts as on. Nobody is exempt, moderators and admins included: what somebody
 * recommends is not a moderation matter.
 *
 * One expression for every place the shouts of a user surface — the profile's list and count,
 * the feed filter behind the profile tab, the shouters of a post — so hiding them in one place
 * cannot leave them readable through another.
 */
export const shoutsVisibleTo = (shouter: string, viewerId: string): string =>
  `(coalesce(${shouter}.showShoutsPublicly, true) OR ${shouter}.id = ${viewerId})`
