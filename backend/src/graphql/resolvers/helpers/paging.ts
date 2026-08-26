import { UserInputError } from '@graphql/errors'

interface PagingArguments {
  first?: number | null
  offset?: number | null
}

/**
 * SKIP/LIMIT for the `first`/`offset` arguments, plus the parameters they reference.
 *
 * The checks are NULLISH, not truthy, and that distinction is the reason this exists.
 * `first: 0` is a valid page size and has to return an EMPTY page; `if (first)` treats it as
 * "not given" and drops the LIMIT entirely, answering the narrowest possible request with
 * every matching row. `offset: 0` is harmless either way — SKIP 0 skips nothing — but is
 * handled the same way so the rule has no exceptions to remember.
 *
 * An absent argument still means unbounded, which is what the queries did before.
 *
 * That unbounded path is a real exposure — one request can read every row of a label — but a
 * server-side maximum is NOT a free fix, and deliberately is not applied here. Two client
 * calls rely on the absence of a limit: `Category(orderBy: postCount_desc)` on the admin page
 * and `Tag(orderBy: id_asc)` behind the hashtag autocomplete. Categories are few; tags are
 * not, and on an active instance a cap would silently shorten that list. Trading a
 * performance risk for quietly incomplete data is the wrong direction — the client cannot
 * tell a truncated answer from a complete one.
 *
 * Bounding it properly means giving those callers an explicit `first` (or a search-driven
 * query) FIRST, and only then enforcing a maximum here. That is a change to the webapp, not
 * to this helper.
 */
export const pagingClause = ({ first, offset }: PagingArguments) => {
  // Neo4j rejects a negative SKIP/LIMIT with an internal error, which surfaces as a 500 for
  // what is plainly a bad request. Failing here names the argument instead.
  if (typeof first === 'number' && first < 0) {
    throw new UserInputError(`Argument "first" must not be negative, got ${String(first)}.`)
  }
  if (typeof offset === 'number' && offset < 0) {
    throw new UserInputError(`Argument "offset" must not be negative, got ${String(offset)}.`)
  }

  const clause = [
    offset === undefined || offset === null ? '' : 'SKIP toInteger($offset)',
    first === undefined || first === null ? '' : 'LIMIT toInteger($first)',
  ]
    .filter(Boolean)
    .join(' ')

  return { clause, params: { offset: offset ?? 0, first: first ?? 0 } }
}
