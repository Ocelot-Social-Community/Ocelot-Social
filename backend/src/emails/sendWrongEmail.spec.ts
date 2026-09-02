import CONFIG from '@config/index'

CONFIG.SUPPORT_EMAIL = 'devops@ocelot.social'

// Dynamic import: under ESM every static import is evaluated before the module
// body runs, so the assignment above would land after this module had already
// read its config. (Under CommonJS the require ran in statement order.)
const { sendWrongEmail } = await import('./sendEmail')

describe('sendWrongEmail', () => {
  const data: {
    name: string
    email: string
    locale: string
  } = {
    name: 'Bob &"?@\\ Baumeister',
    email: 'moderator@example.org',
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
