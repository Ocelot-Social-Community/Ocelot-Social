import { sendResetPasswordMail } from './sendEmail'

describe('sendResetPasswordMail', () => {
  const data: {
    email: string
    nonce: string
    locale: string
    name: string
  } = {
    email: 'user@example.org',
    nonce: '123456',
    locale: 'en',
    name: 'Jenny Rostock',
  }

  describe('English', () => {
    beforeEach(() => {
      data.locale = 'en'
    })

    it('renders correctly', async () => {
      await expect(sendResetPasswordMail(data)).resolves.toMatchSnapshot()
    })
  })

  describe('German', () => {
    beforeEach(() => {
      data.locale = 'de'
    })

    it('renders correctly', async () => {
      await expect(sendResetPasswordMail(data)).resolves.toMatchSnapshot()
    })
  })
})
