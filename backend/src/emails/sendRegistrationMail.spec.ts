import { describe, beforeEach, it, expect } from 'vitest'

import CONFIG from '@config/index'

CONFIG.SUPPORT_EMAIL = 'devops@ocelot.social'

// Dynamic import: under ESM every static import is evaluated before the module
// body runs, so the assignment above would land after this module had already
// read its config. (Under CommonJS the require ran in statement order.)
const { sendRegistrationMail } = await import('./sendEmail')

describe('sendRegistrationMail', () => {
  const data: {
    name: string
    email: string
    nonce: string
    locale: string
    inviteCode?: string
  } = {
    name: 'Bob &"?@\\ Baumeister',
    email: 'moderator@example.org',
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
