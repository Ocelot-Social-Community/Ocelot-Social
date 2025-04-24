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
        },
        from: {
          id: 'p1',
          slug: 'new-post',
          title: 'New Post',
        },
      }),
    ).resolves.toBe(undefined)
  })
})
