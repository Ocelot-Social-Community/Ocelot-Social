import { sendMail, transport } from './sendEmail'



const sendMailMock = jest.spyOn(transport, 'sendMail')

/*
      : (input) => void = jest.fn(() => console.log('HERE'))
jest.mock('./sendEmail', () => {
  const originalModule = jest.requireActual('./sendEmail')
  const { transport } = originalModule
  console.log('-------', transport.sendMail)
  return {
    __esModule: true,
    ...originalModule,
    transport: {
      ...transport,
      sendMail: jest.fn(),
    }
  }
})
*/

describe('sendEmail', () => {
  it('works with followed_user_posted template', async () => {
    await expect(
      sendMail({
        reason: 'followed_user_posted',
        email: 'user@example.org',
        to: {
          name: 'Jenny Rostock',
          id: 'u1',
          slug: 'jenny-rostock',
          locale: 'de',
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
    ).resolves.not.toThrow()
    // expect(sendMailMock).toHaveBeenCalledWith({})
  })

  it('works with mentioned_in_post template', async () => {
    await expect(
      sendMail({
        reason: 'mentioned_in_post',
        email: 'user@example.org',
        to: {
          name: 'Jenny Rostock',
          id: 'u1',
          slug: 'jenny-rostock',
          locale: 'de',
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
    ).resolves.not.toThrow()
  })

  it('works with commented_on_post template', async () => {
    await expect(
      sendMail({
        reason: 'commented_on_post',
        email: 'user@example.org',
        to: {
          name: 'Jenny Rostock',
          id: 'u1',
          slug: 'jenny-rostock',
          locale: 'de',
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
    ).resolves.not.toThrow()
  })

  it('works with mentioned_in_comment template', async () => {
    await expect(
      sendMail({
        reason: 'mentioned_in_comment',
        email: 'user@example.org',
        to: {
          name: 'Jenny Rostock',
          id: 'u1',
          slug: 'jenny-rostock',
          locale: 'de',
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
    ).resolves.not.toThrow()
  })

  it('works with changed_group_member_role template', async () => {
    await expect(
      sendMail({
        reason: 'changed_group_member_role',
        email: 'user@example.org',
        to: {
          name: 'Jenny Rostock',
          id: 'u1',
          slug: 'jenny-rostock',
          locale: 'de',
        },
        from: {
          __typename: 'Group',
          id: 'g1',
          slug: 'the-group',
          name: 'The Group',
        },
      }),
    ).resolves.not.toThrow()
  })

  it('works with user_joined_group template', async () => {
    await expect(
      sendMail({
        reason: 'user_joined_group',
        email: 'user@example.org',
        to: {
          name: 'Jenny Rostock',
          id: 'u1',
          slug: 'jenny-rostock',
          locale: 'de',
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
    ).resolves.not.toThrow()
  })

  it('works with user_left_group template', async () => {
    await expect(
      sendMail({
        reason: 'user_left_group',
        email: 'user@example.org',
        to: {
          name: 'Jenny Rostock',
          id: 'u1',
          slug: 'jenny-rostock',
          locale: 'de',
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
    ).resolves.not.toThrow()
  })

  it('works with removed_user_from_group template', async () => {
    await expect(
      sendMail({
        reason: 'removed_user_from_group',
        email: 'user@example.org',
        to: {
          name: 'Jenny Rostock',
          id: 'u1',
          slug: 'jenny-rostock',
          locale: 'de',
        },
        from: {
          __typename: 'Group',
          id: 'g1',
          slug: 'the-group',
          name: 'The Group',
        },
      }),
    ).resolves.not.toThrow()
  })
})
