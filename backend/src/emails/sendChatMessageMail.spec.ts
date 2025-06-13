import CONFIG from '@config/index'

CONFIG.SUPPORT_EMAIL = 'devops@ocelot.social'

// eslint-disable-next-line import/first
import { sendChatMessageMail } from './sendEmail'

const senderUser = {
  allowEmbedIframes: false,
  createdAt: '2025-04-30T00:16:49.610Z',
  deleted: false,
  disabled: false,
  emailNotificationsChatMessage: true,
  emailNotificationsCommentOnObservedPost: true,
  emailNotificationsFollowingUsers: true,
  emailNotificationsGroupMemberJoined: true,
  emailNotificationsGroupMemberLeft: true,
  emailNotificationsGroupMemberRemoved: true,
  emailNotificationsGroupMemberRoleChanged: true,
  emailNotificationsMention: true,
  emailNotificationsPostInGroup: true,
  encryptedPassword: '$2b$10$n.WujXapJrvn498lS97MD.gn8QwjWI9xlf8ckEYYtMTOPadMidcbG',
  id: 'chatSender',
  locale: 'en',
  name: 'chatSender',
  role: 'user',
  showShoutsPublicly: false,
  slug: 'chatsender',
  termsAndConditionsAgreedAt: '2019-08-01T10:47:19.212Z',
  termsAndConditionsAgreedVersion: '0.0.1',
  updatedAt: '2025-04-30T00:16:49.610Z',
}

const recipientUser = {
  allowEmbedIframes: false,
  createdAt: '2025-04-30T00:16:49.716Z',
  deleted: false,
  disabled: false,
  emailNotificationsChatMessage: true,
  emailNotificationsCommentOnObservedPost: true,
  emailNotificationsFollowingUsers: true,
  emailNotificationsGroupMemberJoined: true,
  emailNotificationsGroupMemberLeft: true,
  emailNotificationsGroupMemberRemoved: true,
  emailNotificationsGroupMemberRoleChanged: true,
  emailNotificationsMention: true,
  emailNotificationsPostInGroup: true,
  encryptedPassword: '$2b$10$KOrCHvEB5CM7D.P3VcX2z.pSSBZKZhPqHW/QKym6V1S6fiG..xtBq',
  id: 'chatReceiver',
  locale: 'en',
  name: 'chatReceiver',
  role: 'user',
  showShoutsPublicly: false,
  slug: 'chatreceiver',
  termsAndConditionsAgreedAt: '2019-08-01T10:47:19.212Z',
  termsAndConditionsAgreedVersion: '0.0.1',
  updatedAt: '2025-04-30T00:16:49.716Z',
}

describe('sendChatMessageMail', () => {
  describe('English', () => {
    beforeEach(() => {
      recipientUser.locale = 'en'
    })

    it('chat_message template', async () => {
      await expect(
        sendChatMessageMail({
          email: 'user@example.org',
          senderUser,
          recipientUser,
        }),
      ).resolves.toMatchSnapshot()
    })
  })

  describe('German', () => {
    beforeEach(() => {
      recipientUser.locale = 'de'
    })

    it('chat_message template', async () => {
      await expect(
        sendChatMessageMail({
          email: 'user@example.org',
          senderUser,
          recipientUser,
        }),
      ).resolves.toMatchSnapshot()
    })
  })
})
