import { deviceErrorMessage } from './deviceError'

const $t = (k) => k

describe('deviceErrorMessage', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'noDevice'],
    ['OverconstrainedError', 'noDevice'],
    ['NotReadableError', 'busy'],
    ['AbortError', 'busy'],
  ])('names %s as reason %s', (name, key) => {
    expect(deviceErrorMessage($t, 'camera', { name })).toBe(
      `videoCall.errors.camera.unavailable videoCall.errors.reason.${key}`,
    )
  })

  it("says try again for anything else, the browser's own text only in the console", () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const err = new Error('boom')
    expect(deviceErrorMessage($t, 'mic', err)).toBe(
      'videoCall.errors.mic.unavailable videoCall.errors.reason.generic',
    )
    expect(warn).toHaveBeenCalledWith('VideoCall: mic did not start', err)
    warn.mockRestore()
  })

  it('says try again when there is no message at all', () => {
    expect(deviceErrorMessage($t, 'screen', null)).toBe(
      'videoCall.errors.screen.unavailable videoCall.errors.reason.generic',
    )
  })
})
