import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import CONFIG from '@config/index'

import { sendRegistrationMail } from './sendEmail'

import type { createTransport } from 'nodemailer'

// The transport the mails would leave through. `email-templates` hands a rendered mail to
// `transport.sendMail` only when it sends, so a call here is a mail that went out.
const { sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn(async (message: unknown) => Promise.resolve({ message })),
}))

vi.mock('nodemailer', async (importOriginal) => {
  const actual = await importOriginal<{ createTransport: typeof createTransport }>()
  return { ...actual, createTransport: () => ({ sendMail }) }
})

const data = {
  name: 'Peter Lustig',
  email: 'peter@example.org',
  nonce: '123456',
  locale: 'en',
}

describe('whether a mail is sent', () => {
  const configured = CONFIG.SEND_MAIL

  beforeEach(() => {
    sendMail.mockClear()
  })

  afterAll(() => {
    CONFIG.SEND_MAIL = configured
  })

  // Set AFTER the module was imported, as db:seed does: the setting has to reach the mails even
  // though the module read the config long before.
  it('follows CONFIG.SEND_MAIL as it is when the mail is sent', async () => {
    CONFIG.SEND_MAIL = true
    await sendRegistrationMail(data)

    expect(sendMail).toHaveBeenCalledTimes(1)

    CONFIG.SEND_MAIL = false
    await sendRegistrationMail(data)

    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it('still renders the mail when it is not sent', async () => {
    CONFIG.SEND_MAIL = false

    await expect(sendRegistrationMail(data)).resolves.toMatchObject({
      to: { address: 'peter@example.org', name: 'Peter Lustig' },
    })
    expect(sendMail).not.toHaveBeenCalled()
  })
})
