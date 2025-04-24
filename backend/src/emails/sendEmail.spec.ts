import { sendMail } from './sendEmail'

describe('sendEmail', () => {
  it('works', async () => {
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
    ).resolves.toBe(undefined)
  })
})
