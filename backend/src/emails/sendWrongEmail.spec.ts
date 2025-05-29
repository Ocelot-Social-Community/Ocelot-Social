import { sendWrongEmail } from './sendEmail'

describe('sendWrongEmail', () => {
  const data: {
    email: string
    locale: string
  } = {
    email: 'user@example.org',
    locale: 'en',
  }

  describe('English', () => {
    beforeEach(() => {
      data.locale = 'en'
    })

    it('renders correctly', async () => {
      await expect(sendWrongEmail(data)).resolves.toMatchSnapshot()
    })
  })

  describe('German', () => {
    beforeEach(() => {
      data.locale = 'de'
    })

    it('renders correctly', async () => {
      await expect(sendWrongEmail(data)).resolves.toMatchSnapshot()
    })
  })
})
