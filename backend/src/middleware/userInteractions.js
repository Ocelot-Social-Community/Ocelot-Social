const createRelatedCypher = (relation) => `
MATCH (user:User { id: $currentUser})
MATCH (post:Post { id: $postId})<-[r:${relation}]-(u:User)
WHERE NOT u.disabled AND NOT u.deleted
WITH user, post, count(DISTINCT u) AS count
MERGE (user)-[relation:${relation} { }]->(post)
ON CREATE
SET relation.count = 1,
relation.createdAt = toString(datetime()),
post.clickCount =  count + 1
ON MATCH
SET relation.count = relation.count + 1,
relation.updatedAt = toString(datetime()),
post.clickCount = count
RETURN user, post, relation
`

const setPostCounter = async (postId, relation, context) => {
  const { user: currentUser } = context
  const session = context.driver.session()
  try {
    await session.writeTransaction((txc) => {
      return txc.run(
        createRelatedCypher(relation),
        { currentUser, postId },
      )
    })
  } finally {
    session.close()
  }  
}

const userClickedPost = async (resolve, root, args, context, info) => {
  if (args.id) {
    await setPostCounter(args.id, 'CLICKED', context)
  }
  return resolve(root, args, context, info)
}

export default {
  Query: {
    Post: userClickedPost,
  },
}
