import { makeExecutableSchema } from '@graphql-tools/schema'

import typeDefs from '@graphql/types/index'

import resolvers from './resolvers/index'

// The executable schema: exactly what the .gql files declare, wired to our resolvers.
//
// Nothing is generated on top of it. neo4j-graphql-js used to add root queries,
// filter/ordering inputs and an `_id` field to every type here, and to take over any field
// carrying a @cypher directive. Since its removal all of that is explicit — the queries have
// hand-written resolvers, the filter and ordering inputs are declared in the .gql files, and
// `_id` survives only as a deprecated alias on the three types the chat frontend selects it
// on (Room, Message, User).
export default makeExecutableSchema({ typeDefs, resolvers })
