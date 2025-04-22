import { makeAugmentedSchema } from 'neo4j-graphql-js'

import resolvers from './resolvers'
import typeDefs from './types'

import type { IResolvers } from 'graphql-tools'

export default makeAugmentedSchema({
  typeDefs,
  resolvers: resolvers as IResolvers,
  config: {
    query: {
      exclude: [
        'Badge',
        'Embed',
        'EmailNotificationSettings',
        'EmailNotificationSettingsOption',
        'EmailAddress',
        'Notification',
        'Statistics',
        'LoggedInUser',
        'Location',
        'SocialMedia',
        'NOTIFIED',
        'FILED',
        'REVIEWED',
        'Report',
        'Group',
      ],
    },
    mutation: false,
  },
})
