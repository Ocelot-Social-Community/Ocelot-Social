import type { PostQueryParams } from './postFilter'
import type { Context } from '@src/context'

// Translates the client-facing `postsInMyGroups` flag into a graph condition.
//
// It used to fetch the ids of every group the viewer belongs to and pass them in as
// `group.id_in`. The membership set is bounded, so this was never the scaling problem that
// the invisible-post list was — but it is still one query per request for something the
// main query can express itself (see the `inGroupsOf` operator).
export const filterPostsOfMyGroups = (
  params: PostQueryParams,
  context: Context,
): PostQueryParams => {
  if (!params.filter?.postsInMyGroups) {
    return params
  }
  const { postsInMyGroups: _flag, ...rest } = params.filter
  return { ...params, filter: { ...rest, inGroupsOf: context.user?.id ?? null } }
}
