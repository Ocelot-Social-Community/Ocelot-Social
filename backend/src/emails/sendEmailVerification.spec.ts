import { describe, beforeEach, it, expect } from 'vitest'

import CONFIG from '@config/index'

CONFIG.SUPPORT_EMAIL = 'devops@ocelot.social'

// Dynamic import: under ESM every static import is evaluated before the module
// body runs, so the assignment above would land after this module had already
// read its config. (Under CommonJS the require ran in statement order.)
const { sendEmailVerification } = await import('./sendEmail')

describe('sendEmailVerification', () => {
  const data: {
    email: string
    nonce: string
    locale: string
    name: string
  } = {
    email: 'user@example.org',
    nonce: '123456',
    locale: 'en',
    name: 'User',
  }

  describe('english', () => {
    beforeEach(() => {
      data.locale = 'en'
    })

    it('renders correctly', async () => {
      await expect(sendEmailVerification(data)).resolves.toMatchSnapshot()
    })
  })

  describe('german', () => {
    beforeEach(() => {
      data.locale = 'de'
    })

    it('renders correctly', async () => {
      await expect(sendEmailVerification(data)).resolves.toMatchSnapshot()
    })
  })
})
