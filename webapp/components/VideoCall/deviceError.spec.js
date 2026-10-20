import { deviceErrorMessage } from './deviceError'

const $t = (k) => k

describe('deviceErrorMessage', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'noDevice'],
    ['OverconstrainedError', 'noDevice'],
    ['NotReadableError', 'busy'],
  ])('names %s as reason %s', (name, key) => {
    expect(deviceErrorMessage($t, 'camera', { name })).toBe(
      `videoCall.errors.camera.unavailable videoCall.errors.reason.${key}`,
    )
  })

  it("passes the browser's own message on for anything else", () => {
    expect(deviceErrorMessage($t, 'mic', new Error('boom'))).toBe(
      'videoCall.errors.mic.unavailable boom',
    )
  })

  it('says try again when there is no message at all', () => {
    expect(deviceErrorMessage($t, 'screen', null)).toBe(
      'videoCall.errors.screen.unavailable videoCall.errors.reason.generic',
    )
  })
})
