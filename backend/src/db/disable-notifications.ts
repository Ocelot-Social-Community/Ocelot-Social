import databaseContext from '@context/database'

const run = async () => {
  const args = process.argv.slice(2)

  if (args.length !== 1) {
    // eslint-disable-next-line no-console
    console.error('Usage: yarn run db:func:disable-notifications <email>')
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }

  const email = args[0]

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    // eslint-disable-next-line no-console
    console.error('Error: Invalid email address format')
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }

  const { write } = databaseContext()

  const result = (
    await write({
      query: `
    MATCH (:EmailAddress {email: $email})-[:BELONGS_TO]->(user:User)
      SET user.emailNotificationsFollowingUsers = false
      SET user.emailNotificationsPostInGroup = false
      SET user.emailNotificationsCommentOnObservedPost = false
      SET user.emailNotificationsMention = false
      SET user.emailNotificationsChatMessage = false
      SET user.emailNotificationsGroupMemberJoined = false
      SET user.emailNotificationsGroupMemberLeft = false
      SET user.emailNotificationsGroupMemberRemoved = false
      SET user.emailNotificationsGroupMemberRoleChanged = false
    RETURN toString(count(user)) as count
    `,
      variables: {
        email,
      },
    })
  ).records[0].get('count') as string

  if (result !== '1') {
    // eslint-disable-next-line no-console
    console.error(`User with email address ${email} not found`)
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }

  // eslint-disable-next-line no-console
  console.log(`Notifications for User with email address ${email} disabled`)
  // eslint-disable-next-line n/no-process-exit
  process.exit(0)
}

void (async function () {
  await run()
})()
