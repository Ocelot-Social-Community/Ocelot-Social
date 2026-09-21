import type { PostQueryParams } from './postFilter'
import type { ViewerScope } from './viewerGroups'

// Translates the client-facing `postsInMyGroups` flag into a graph condition.
//
// It used to fetch the ids of every group the viewer belongs to and pass them in as
// `group.id_in`, then moved to asking the graph per post. Both are gone: the membership set is
// resolved once per request (see viewerGroups.ts) and shared with `filterInvisiblePosts`, so
// "the groups I am an active member of" is looked up once and means the same thing in both
// filters.
export const filterPostsOfMyGroups = (
  params: PostQueryParams,
  viewer: ViewerScope,
): PostQueryParams => {
  if (!params.filter?.postsInMyGroups) {
    return params
  }
  const { postsInMyGroups: _flag, ...rest } = params.filter
  return { ...params, filter: { ...rest, inGroupsOf: viewer.groupIds } }
}
