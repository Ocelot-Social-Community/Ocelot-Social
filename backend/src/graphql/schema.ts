import { makeExecutableSchema } from '@graphql-tools/schema'

import typeDefs from '@graphql/types/index'

import resolvers from './resolvers'

// Plain executable schema. Until stage D of the neo4j-graphql-js migration this was
// makeAugmentedSchema(), which generated root queries, filter/ordering inputs and an `_id`
// field on every type, and which replaced our field resolvers for anything carrying a
// @cypher directive. All of that is now explicit: the queries have hand-written resolvers,
// the filter/ordering inputs live in the .gql files, and `_id` is a deprecated alias on the
// three types the chat frontend selects it on.
export default makeExecutableSchema({ typeDefs, resolvers })
