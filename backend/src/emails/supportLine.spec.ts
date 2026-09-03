import { describe, beforeEach, it, expect } from 'vitest'

import { sendResetPasswordMail, defaultParams } from './sendEmail'

describe(sendResetPasswordMail, () => {
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

  describe('with support', () => {
    beforeEach(() => {
      defaultParams.SUPPORT_EMAIL = 'support@example.org'
    })

    describe('english', () => {
      beforeEach(() => {
        data.locale = 'en'
      })

      it('renders correctly', async () => {
        await expect(sendResetPasswordMail(data)).resolves.toMatchSnapshot()
      })
    })

    describe('german', () => {
      beforeEach(() => {
        data.locale = 'de'
      })

      it('renders correctly', async () => {
        await expect(sendResetPasswordMail(data)).resolves.toMatchSnapshot()
      })
    })
  })

  describe('without support', () => {
    beforeEach(() => {
      delete defaultParams.SUPPORT_EMAIL
    })

    describe('english', () => {
      beforeEach(() => {
        data.locale = 'en'
      })

      it('renders correctly', async () => {
        await expect(sendResetPasswordMail(data)).resolves.toMatchSnapshot()
      })
    })

    describe('german', () => {
      beforeEach(() => {
        data.locale = 'de'
      })

      it('renders correctly', async () => {
        await expect(sendResetPasswordMail(data)).resolves.toMatchSnapshot()
      })
    })
  })
})
