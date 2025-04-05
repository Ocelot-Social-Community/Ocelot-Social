import { getDriver } from '../../db/neo4j'

export const description =
  'Transforms the `sendNotificationEmails` property on User to a multi value system'

export async function up(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(`
      MATCH (user:User)
      SET user.emailNotificationsCommentOnObservedPost = user.sendNotificationEmails
      SET user.emailNotificationsMention = user.sendNotificationEmails
      SET user.emailNotificationsGroupMemberJoined = user.sendNotificationEmails
      SET user.emailNotificationsGroupMemberLeft = user.sendNotificationEmails
      SET user.emailNotificationsGroupMemberRemoved = user.sendNotificationEmails
      SET user.emailNotificationsGroupMemberRoleChanged = user.sendNotificationEmails
      REMOVE user.sendNotificationEmails
    `)
    await transaction.commit()
    next()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    session.close()
  }
}

export async function down(next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(`
      MATCH (user:User)
      SET user.sendNotificationEmails = true
      REMOVE user.emailNotificationsCommentOnObservedPost
      REMOVE user.emailNotificationsMention
      REMOVE user.emailNotificationsGroupMemberJoined
      REMOVE user.emailNotificationsGroupMemberLeft
      REMOVE user.emailNotificationsGroupMemberRemoved
      REMOVE user.emailNotificationsGroupMemberRoleChanged
    `)
    await transaction.commit()
    next()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    session.close()
  }
}
