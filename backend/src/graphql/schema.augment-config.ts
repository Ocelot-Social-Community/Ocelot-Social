// neo4j-graphql-js augmentation config, shared by the runtime schema (schema.ts,
// with resolvers) and the schema printer (print-schema.ts, typeDefs only).
//
// Kept in its own module — free of resolver/config imports — so the schema
// STRUCTURE can be built for printing/docs WITHOUT pulling in runtime config and
// its required-env assertions. The SDL is defined by typeDefs + this config;
// resolvers only affect execution.
export const augmentedSchemaConfig = {
  query: {
    exclude: [
      'ApiKey',
      'ApiKeyWithSecret',
      'ApiKeyUserSummary',
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
      'VideoCallConfig',
      'VideoCallJoinPayload',
      'VideoCallParticipantCount',
    ],
  },
  mutation: false,
}
