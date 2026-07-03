/* eslint-disable @typescript-eslint/no-unsafe-call */
import { print } from 'graphql'
import { makeAugmentedSchema } from 'neo4j-graphql-js'

import typeDefs from '@graphql/types/index'

import resolvers from './resolvers'
import { augmentedSchemaConfig } from './schema.augment-config'

export default makeAugmentedSchema({
  typeDefs: print(typeDefs),
  resolvers,
  config: augmentedSchemaConfig,
})
