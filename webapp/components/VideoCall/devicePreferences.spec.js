import {
  findPreferredDevice,
  loadDevicePreferences,
  saveDevicePreference,
} from './devicePreferences'

const STORAGE_KEY = 'ocelot-video-call-devices'

describe('devicePreferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadDevicePreferences', () => {
    it('is empty when nothing was stored', () => {
      expect(loadDevicePreferences()).toEqual({})
    })

    it('is empty when the stored content is not ours', () => {
      localStorage.setItem(STORAGE_KEY, 'not json')
      expect(loadDevicePreferences()).toEqual({})
      localStorage.setItem(STORAGE_KEY, '"text"')
      expect(loadDevicePreferences()).toEqual({})
      localStorage.setItem(STORAGE_KEY, 'null')
      expect(loadDevicePreferences()).toEqual({})
    })
  })

  describe('saveDevicePreference', () => {
    it('stores one device per kind and keeps the others', () => {
      saveDevicePreference('videoinput', { deviceId: 'cam-1', label: 'Webcam', kind: 'videoinput' })
      saveDevicePreference('audioinput', { deviceId: 'mic-1' })
      saveDevicePreference('videoinput', { deviceId: 'cam-2', label: 'Other' })
      expect(loadDevicePreferences()).toEqual({
        videoinput: { deviceId: 'cam-2', label: 'Other' },
        audioinput: { deviceId: 'mic-1', label: '' },
      })
    })

    it('ignores a missing device', () => {
      saveDevicePreference('videoinput', undefined)
      saveDevicePreference('videoinput', { deviceId: '' })
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('swallows a storage that refuses to write', () => {
      const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota')
      })
      expect(() => saveDevicePreference('videoinput', { deviceId: 'cam-1' })).not.toThrow()
      setItem.mockRestore()
    })
  })

  describe('findPreferredDevice', () => {
    const devices = [
      { deviceId: 'a', label: 'Built-in' },
      { deviceId: 'b', label: 'Headset' },
    ]

    it('finds the device by its id', () => {
      expect(findPreferredDevice(devices, { deviceId: 'b', label: 'renamed' })).toBe(devices[1])
    })

    it('falls back to the label when the id is gone', () => {
      expect(findPreferredDevice(devices, { deviceId: 'old', label: 'Headset' })).toBe(devices[1])
    })

    it('finds nothing without a preference, a match, or a label to go by', () => {
      expect(findPreferredDevice(devices, undefined)).toBeNull()
      expect(findPreferredDevice(devices, { deviceId: 'old', label: 'Gone' })).toBeNull()
      expect(
        findPreferredDevice([{ deviceId: 'x', label: '' }], { deviceId: 'old', label: '' }),
      ).toBeNull()
    })
  })
})
