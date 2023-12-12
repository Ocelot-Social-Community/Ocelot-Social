import log from './helpers/databaseLogger'
import { queryString } from './searches/queryString'

// see http://lucene.apache.org/core/8_3_1/queryparser/org/apache/lucene/queryparser/classic/package-summary.html#package.description

const cypherTemplate = (setup) => `
  CALL db.index.fulltext.queryNodes('${setup.fulltextIndex}', $query)
  YIELD node AS resource, score
  ${setup.match}
  ${setup.whereClause}
  ${setup.withClause}
  RETURN 
  ${setup.returnClause}
  AS result
  SKIP toInteger($skip)
  ${setup.limit}
`

const simpleWhereClause =
  'WHERE score >= 0.0 AND NOT (resource.deleted = true OR resource.disabled = true)'

const postWhereClause = `WHERE score >= 0.0
  AND NOT (
    author.deleted = true OR author.disabled = true
    OR resource.deleted = true OR resource.disabled = true
  ) AND block IS NULL AND restriction IS NULL`

const searchPostsSetup = {
  fulltextIndex: 'post_fulltext_search',
  match: `MATCH (resource:Post)<-[:WROTE]-(author:User)
          MATCH (user:User {id: $userId})
          OPTIONAL MATCH (user)-[block:MUTED]->(author)
          OPTIONAL MATCH (user)-[restriction:CANNOT_SEE]->(resource)
          WITH user, resource, author, block, restriction`,
  whereClause: postWhereClause,
  withClause: `WITH resource, author,
  [(resource)<-[:COMMENTS]-(comment:Comment) | comment] AS comments,
  [(resource)<-[:SHOUTED]-(user:User) | user] AS shouter`,
  returnClause: `resource {
    .*,
    __typename: 'Post',
    author: properties(author),
    commentsCount: toString(size(comments)),
    shoutedCount: toString(size(shouter)),
    clickedCount: toString(resource.clickedCount),
    viewedTeaserCount: toString(resource.viewedTeaserCount)
  }`,
  limit: 'LIMIT toInteger($limit)',
}

const searchUsersSetup = {
  fulltextIndex: 'user_fulltext_search',
  match: 'MATCH (resource:User)',
  whereClause: simpleWhereClause,
  withClause: '',
  returnClause: `resource {.*, __typename: 'User'}`,
  limit: 'LIMIT toInteger($limit)',
}

const searchHashtagsSetup = {
  fulltextIndex: 'tag_fulltext_search',
  match: 'MATCH (resource:Tag)',
  whereClause: simpleWhereClause,
  withClause: '',
  returnClause: `resource {.*, __typename: 'Tag'}`,
  limit: 'LIMIT toInteger($limit)',
}

const searchGroupsSetup = {
  fulltextIndex: 'group_fulltext_search',
  match: `MATCH (resource:Group)
          MATCH (user:User {id: $userId})
          OPTIONAL MATCH (user)-[membership:MEMBER_OF]->(resource)
          WITH user, resource, membership`,
  whereClause: `WHERE score >= 0.0
                AND NOT (resource.deleted = true OR resource.disabled = true)
                AND (resource.groupType IN ['public', 'closed']
                  OR membership.role IN ['usual', 'admin', 'owner'])`,
  withClause: 'WITH resource, membership',
  returnClause: `resource { .*, myRole: membership.role, __typename: 'Group' }`,
  limit: 'LIMIT toInteger($limit)',
}

const countSetup = {
  returnClause: 'toString(size(collect(resource)))',
  limit: '',
}

const countUsersSetup = {
  ...searchUsersSetup,
  ...countSetup,
}
const countPostsSetup = {
  ...searchPostsSetup,
  ...countSetup,
}
const countHashtagsSetup = {
  ...searchHashtagsSetup,
  ...countSetup,
}
const countGroupsSetup = {
  ...searchGroupsSetup,
  ...countSetup,
}

const searchResultPromise = async (session, setup, params) => {
  return session.readTransaction(async (transaction) => {
    return transaction.run(cypherTemplate(setup), params)
  })
}

const searchResultCallback = (result) => {
  const response = result.records.map((r) => r.get('result'))
  if (Array.isArray(response) && response.length && response[0].__typename === 'Post') {
    response.forEach((post) => {
      post.postType = [post.postType]
    })
  }
  return response
}

const countResultCallback = (result) => {
  return result.records[0].get('result')
}

const getSearchResults = async (context, setup, params, resultCallback = searchResultCallback) => {
  const session = context.driver.session()
  try {
    const results = await searchResultPromise(session, setup, params)
    log(results)
    return resultCallback(results)
  } finally {
    session.close()
  }
}

const multiSearchMap = [
  { symbol: '!', setup: searchPostsSetup, resultName: 'posts' },
  { symbol: '@', setup: searchUsersSetup, resultName: 'users' },
  { symbol: '#', setup: searchHashtagsSetup, resultName: 'hashtags' },
  { symbol: '&', setup: searchGroupsSetup, resultName: 'groups' },
]

export default {
  Query: {
    searchPosts: async (_parent, args, context, _resolveInfo) => {
      const { query, postsOffset, firstPosts } = args
      let userId = null
      if (context.user) userId = context.user.id
      return {
        postCount: getSearchResults(
          context,
          countPostsSetup,
          {
            query: queryString(query),
            skip: 0,
            userId,
          },
          countResultCallback,
        ),
        posts: getSearchResults(context, searchPostsSetup, {
          query: queryString(query),
          skip: postsOffset,
          limit: firstPosts,
          userId,
        }),
      }
    },
    searchUsers: async (_parent, args, context, _resolveInfo) => {
      const { query, usersOffset, firstUsers } = args
      return {
        userCount: getSearchResults(
          context,
          countUsersSetup,
          {
            query: queryString(query),
            skip: 0,
          },
          countResultCallback,
        ),
        users: getSearchResults(context, searchUsersSetup, {
          query: queryString(query),
          skip: usersOffset,
          limit: firstUsers,
        }),
      }
    },
    searchHashtags: async (_parent, args, context, _resolveInfo) => {
      const { query, hashtagsOffset, firstHashtags } = args
      return {
        hashtagCount: getSearchResults(
          context,
          countHashtagsSetup,
          {
            query: queryString(query),
            skip: 0,
          },
          countResultCallback,
        ),
        hashtags: getSearchResults(context, searchHashtagsSetup, {
          query: queryString(query),
          skip: hashtagsOffset,
          limit: firstHashtags,
        }),
      }
    },
    searchGroups: async (_parent, args, context, _resolveInfo) => {
      const { query, groupsOffset, firstGroups } = args
      let userId = null
      if (context.user) userId = context.user.id
      return {
        groupCount: getSearchResults(
          context,
          countGroupsSetup,
          {
            query: queryString(query),
            skip: 0,
            userId,
          },
          countResultCallback,
        ),
        groups: getSearchResults(context, searchGroupsSetup, {
          query: queryString(query),
          skip: groupsOffset,
          limit: firstGroups,
          userId,
        }),
      }
    },
    searchResults: async (_parent, args, context, _resolveInfo) => {
      const { query, limit } = args
      const userId = context.user?.id || null

      const searchType = query.replace(/^([!@#&]?).*$/, '$1')
      const searchString = query.replace(/^([!@#&])/, '')

      const params = {
        query: queryString(searchString),
        skip: 0,
        limit,
        userId,
      }

      if (searchType === '')
        return [
          ...(await getSearchResults(context, searchPostsSetup, params)),
          ...(await getSearchResults(context, searchUsersSetup, params)),
          ...(await getSearchResults(context, searchGroupsSetup, params)),
          ...(await getSearchResults(context, searchHashtagsSetup, params)),
        ]

      params.limit = 15
      const type: any = multiSearchMap.find((obj) => obj.symbol === searchType)
      return getSearchResults(context, type.setup, params)
    },
  },
}
