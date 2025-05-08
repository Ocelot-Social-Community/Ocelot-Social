import { sendRegistrationMail } from './sendEmail'

describe('sendRegistrationMail', () => {
  const data: {
    email: string
    nonce: string
    locale: string
    inviteCode?: string
  } = {
    email: 'user@example.org',
    nonce: '123456',
    locale: 'en',
    inviteCode: 'welcome',
  }

  describe('with invite code', () => {
    describe('English', () => {
      beforeEach(() => {
        data.locale = 'en'
        data.inviteCode = 'welcome'
      })

      it('renders correctly', async () => {
        await expect(sendRegistrationMail(data)).resolves.toMatchSnapshot()
      })
    })

    describe('German', () => {
      beforeEach(() => {
        data.locale = 'de'
        data.inviteCode = 'welcome'
      })

      it('renders correctly', async () => {
        await expect(sendRegistrationMail(data)).resolves.toMatchSnapshot()
      })
    })
  })

  describe('without invite code', () => {
    describe('English', () => {
      beforeEach(() => {
        data.locale = 'en'
        delete data.inviteCode
      })

      it('renders correctly', async () => {
        await expect(sendRegistrationMail(data)).resolves.toMatchSnapshot()
      })
    })

    describe('German', () => {
      beforeEach(() => {
        data.locale = 'de'
        delete data.inviteCode
      })

      it('renders correctly', async () => {
        await expect(sendRegistrationMail(data)).resolves.toMatchSnapshot()
      })
    })
  })
})
