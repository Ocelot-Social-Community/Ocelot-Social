/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export default {
  Query: {
    userData: async (_object, _args, context, _resolveInfo) => {
      const id = context.user.id
      const cypher = `
        MATCH (user:User { id: $id })
        WITH user
        OPTIONAL MATCH (posts:Post)
        WHERE (user)-[:WROTE]->(posts)
        AND posts.deleted = FALSE
        AND posts.disabled = FALSE
        RETURN { user: properties(user),
          posts: collect( 
            posts {
              .*,
              author: [
                (posts)<-[:WROTE]-(author:User) |
                author {
                  .*
                }  
              ][0],
              comments: [
                (posts)<-[:COMMENTS]-(comment:Comment)
                WHERE comment.disabled = FALSE
                AND comment.deleted = FALSE |
                  comment {
                    .*,
                    author: [ (comment)<-[:WROTE]-(commentator:User) |
                      commentator { .name, .slug, .id } ][0]
                  }
              ],
              categories: [ (posts)-[:CATEGORIZED]->(category:Category) |
                category { .name, .id } ]
          })
        } AS result`
      const session = context.driver.session()
      const resultPromise = session.readTransaction(async (transaction) => {
        const transactionResponse = transaction.run(cypher, {
          id,
        })
        return transactionResponse
      })

      try {
        const result = await resultPromise
        const userData = result.records[0].get('result')
        userData.posts.sort(byCreationDate)
        userData.posts.forEach((post) => post.comments.sort(byCreationDate))
        return userData
      } finally {
        session.close()
      }
    },
  },
}

const byCreationDate = (a, b) => {
  if (a.createdAt < b.createdAt) return -1
  if (a.createdAt > b.createdAt) return 1
  return 0
}
