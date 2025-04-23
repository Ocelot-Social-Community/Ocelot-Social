import { sendMail } from './sendEmail'

describe('sendEmail', () => {
  it('works', async () => {
    await expect(sendMail()).resolves.toBe(undefined)
  })
})
