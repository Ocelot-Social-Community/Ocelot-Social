import { makeAugmentedSchema } from 'neo4j-graphql-js'

import resolvers from './resolvers'
import typeDefs from './types'

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
