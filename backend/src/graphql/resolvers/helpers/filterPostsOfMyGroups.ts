import type { PostQueryParams } from './postFilter'
import type { ViewerScope } from './viewerGroups'

// Translates the client-facing `postsInMyGroups` flag into a graph condition.
//
// It used to fetch the ids of every group the viewer belongs to and pass them in as
// `group.id_in`, then moved to asking the graph per post. Both are gone: the set is resolved
// once per request (see viewerGroups.ts) and shared with `filterInvisiblePosts`, so it is
// looked up once and means the same thing in both filters.
//
// The set is "my groups whose content I may read" rather than "my groups": a group that
// withheld `group.content.read` from the viewer's role shows them nothing anyway, and
// `invisibleTo` would filter those posts out one step later regardless.
export const filterPostsOfMyGroups = (
  params: PostQueryParams,
  viewer: ViewerScope,
): PostQueryParams => {
  if (!params.filter?.postsInMyGroups) {
    return params
  }
  const { postsInMyGroups: _flag, ...rest } = params.filter
  return { ...params, filter: { ...rest, inGroupsOf: viewer.contentGroupIds } }
}
