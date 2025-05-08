/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { makeAugmentedSchema } from 'neo4j-graphql-js'

import typeDefs from '@graphql/types/index'

import resolvers from './resolvers'

export default makeAugmentedSchema({
  typeDefs,
  resolvers,
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
