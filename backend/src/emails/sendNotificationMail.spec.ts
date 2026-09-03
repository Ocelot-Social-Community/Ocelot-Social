import { describe, beforeEach, it, expect } from 'vitest'

import CONFIG from '@config/index'

CONFIG.SUPPORT_EMAIL = 'devops@ocelot.social'

// Dynamic import: under ESM every static import is evaluated before the module
// body runs, so the assignment above would land after this module had already
// read its config. (Under CommonJS the require ran in statement order.)
const { sendNotificationMail } = await import('./sendEmail')

describe('sendNotificationMail', () => {
  let locale = 'en'

  describe('english', () => {
    beforeEach(() => {
      locale = 'en'
    })

    it('followed_user_posted template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'followed_user_posted',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            id: 'p1',
            slug: 'new-post',
            title: 'New Post',
            author: {
              id: 'u2',
              name: 'Peter Lustig',
              slug: 'peter-lustig',
            },
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('post_in_group template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'post_in_group',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            id: 'p1',
            slug: 'new-post',
            title: 'New Post',
            author: {
              id: 'u2',
              name: 'Peter Lustig',
              slug: 'peter-lustig',
            },
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('mentioned_in_post template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'mentioned_in_post',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            id: 'p1',
            slug: 'new-post',
            title: 'New Post',
            author: {
              id: 'u2',
              name: 'Peter Lustig',
              slug: 'peter-lustig',
            },
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('commented_on_post template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'commented_on_post',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Comment',
            id: 'c1',
            slug: 'new-comment',
            author: {
              id: 'u2',
              name: 'Peter Lustig',
              slug: 'peter-lustig',
            },
            post: {
              id: 'p1',
              slug: 'new-post',
              title: 'New Post',
            },
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('mentioned_in_comment template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'mentioned_in_comment',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Comment',
            id: 'c1',
            slug: 'new-comment',
            author: {
              id: 'u2',
              name: 'Peter Lustig',
              slug: 'peter-lustig',
            },
            post: {
              id: 'p1',
              slug: 'new-post',
              title: 'New Post',
            },
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('changed_group_member_role template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'changed_group_member_role',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Group',
            id: 'g1',
            slug: 'the-group',
            name: 'The Group',
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('user_joined_group template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'user_joined_group',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Group',
            id: 'g1',
            slug: 'the-group',
            name: 'The Group',
          },
          relatedUser: {
            id: 'u2',
            name: 'Peter Lustig',
            slug: 'peter-lustig',
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('user_left_group template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'user_left_group',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Group',
            id: 'g1',
            slug: 'the-group',
            name: 'The Group',
          },
          relatedUser: {
            id: 'u2',
            name: 'Peter Lustig',
            slug: 'peter-lustig',
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('removed_user_from_group template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'removed_user_from_group',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Group',
            id: 'g1',
            slug: 'the-group',
            name: 'The Group',
          },
        }),
      ).resolves.toMatchSnapshot()
    })
  })

  describe('german', () => {
    beforeEach(() => {
      locale = 'de'
    })

    it('followed_user_posted template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'followed_user_posted',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            id: 'p1',
            slug: 'new-post',
            title: 'New Post',
            author: {
              id: 'u2',
              name: 'Peter Lustig',
              slug: 'peter-lustig',
            },
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('post_in_group template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'post_in_group',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            id: 'p1',
            slug: 'new-post',
            title: 'New Post',
            author: {
              id: 'u2',
              name: 'Peter Lustig',
              slug: 'peter-lustig',
            },
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('mentioned_in_post template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'mentioned_in_post',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            id: 'p1',
            slug: 'new-post',
            title: 'New Post',
            author: {
              id: 'u2',
              name: 'Peter Lustig',
              slug: 'peter-lustig',
            },
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('commented_on_post template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'commented_on_post',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Comment',
            id: 'c1',
            slug: 'new-comment',
            author: {
              id: 'u2',
              name: 'Peter Lustig',
              slug: 'peter-lustig',
            },
            post: {
              id: 'p1',
              slug: 'new-post',
              title: 'New Post',
            },
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('mentioned_in_comment template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'mentioned_in_comment',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Comment',
            id: 'c1',
            slug: 'new-comment',
            author: {
              id: 'u2',
              name: 'Peter Lustig',
              slug: 'peter-lustig',
            },
            post: {
              id: 'p1',
              slug: 'new-post',
              title: 'New Post',
            },
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('changed_group_member_role template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'changed_group_member_role',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Group',
            id: 'g1',
            slug: 'the-group',
            name: 'The Group',
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('user_joined_group template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'user_joined_group',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Group',
            id: 'g1',
            slug: 'the-group',
            name: 'The Group',
          },
          relatedUser: {
            id: 'u2',
            name: 'Peter Lustig',
            slug: 'peter-lustig',
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('user_left_group template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'user_left_group',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Group',
            id: 'g1',
            slug: 'the-group',
            name: 'The Group',
          },
          relatedUser: {
            id: 'u2',
            name: 'Peter Lustig',
            slug: 'peter-lustig',
          },
        }),
      ).resolves.toMatchSnapshot()
    })

    it('removed_user_from_group template', async () => {
      await expect(
        sendNotificationMail({
          reason: 'removed_user_from_group',
          email: 'user@example.org',
          to: {
            name: 'Jenny Rostock',
            id: 'u1',
            slug: 'jenny-rostock',
            locale,
          },
          from: {
            __typename: 'Group',
            id: 'g1',
            slug: 'the-group',
            name: 'The Group',
          },
        }),
      ).resolves.toMatchSnapshot()
    })
  })
})
