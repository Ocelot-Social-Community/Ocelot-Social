/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable security/detect-non-literal-fs-filename */
import { getDriver } from '@db/neo4j'

export const description =
  'Transforms the `sendNotificationEmails` property on User to a multi value system'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(`
      MATCH (user:User)
      SET user.emailNotificationsCommentOnObservedPost = user.sendNotificationEmails
      SET user.emailNotificationsMention = user.sendNotificationEmails
      SET user.emailNotificationsChatMessage = user.sendNotificationEmails
      SET user.emailNotificationsGroupMemberJoined = user.sendNotificationEmails
      SET user.emailNotificationsGroupMemberLeft = user.sendNotificationEmails
      SET user.emailNotificationsGroupMemberRemoved = user.sendNotificationEmails
      SET user.emailNotificationsGroupMemberRoleChanged = user.sendNotificationEmails
      REMOVE user.sendNotificationEmails
    `)
    await transaction.commit()
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

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Implement your migration here.
    await transaction.run(`
      MATCH (user:User)
      SET user.sendNotificationEmails = user.emailNotificationsMention
      REMOVE user.emailNotificationsCommentOnObservedPost
      REMOVE user.emailNotificationsMention
      REMOVE user.emailNotificationsChatMessage
      REMOVE user.emailNotificationsGroupMemberJoined
      REMOVE user.emailNotificationsGroupMemberLeft
      REMOVE user.emailNotificationsGroupMemberRemoved
      REMOVE user.emailNotificationsGroupMemberRoleChanged
    `)
    await transaction.commit()
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
