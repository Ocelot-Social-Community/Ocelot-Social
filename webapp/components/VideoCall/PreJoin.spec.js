import Vuex from 'vuex'
import { mount, createLocalVue } from '@vue/test-utils'
import PreJoin from './PreJoin.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

const Stub = (name, opts = {}) => ({
  name,
  props: opts.props || [],
  template: opts.template || `<div class="stub-${name.toLowerCase()}"><slot /></div>`,
})

const stubs = {
  OsButton: Stub('OsButton', {
    template: '<button class="stub-button" @click="$emit(\'click\')"><slot /></button>',
  }),
  OsIcon: Stub('OsIcon'),
  ProfileAvatar: Stub('ProfileAvatar'),
}

// Most tests don't care about the mounted hook — they exercise methods/
// computed in isolation. Mount with a no-op `mounted` so we don't race the
// async initDevices promise chain against the test's own assertions.
const mountWith = (mediaDevicesMock = null, { runMounted = false } = {}) => {
  const stream = {
    getTracks: () => [],
    getAudioTracks: () => [],
    getVideoTracks: () => [],
  }
  const defaultMediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue(stream),
    enumerateDevices: jest.fn().mockResolvedValue([]),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }
  const mediaDevices = mediaDevicesMock || defaultMediaDevices
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: mediaDevices,
    configurable: true,
  })
  Object.defineProperty(global.navigator, 'permissions', {
    value: { query: jest.fn().mockRejectedValue(new Error('not supported')) },
    configurable: true,
  })

  const store = new Vuex.Store({
    getters: {
      'auth/user': () => ({ id: 'u1', name: 'Alice', avatar: { url: 'a.png' } }),
    },
  })
  const Component = runMounted ? PreJoin : { ...PreJoin, mounted() {} }
  return {
    wrapper: mount(Component, {
      localVue,
      store,
      mocks: { $t: (k) => k },
      stubs,
    }),
    mediaDevices,
  }
}

describe('PreJoin', () => {
  describe('joinHint computed', () => {
    it('returns hintBoth when neither cam nor mic active', () => {
      const { wrapper } = mountWith()
      wrapper.setData({ cameraActive: false, micActive: false })
      expect(wrapper.vm.joinHint).toBe('videoCall.prejoin.hintBoth')
    })

    it('returns hintMic when mic only is off', () => {
      const { wrapper } = mountWith()
      wrapper.setData({ cameraActive: true, micActive: false })
      expect(wrapper.vm.joinHint).toBe('videoCall.prejoin.hintMic')
    })

    it('returns hintCamera when cam only is off', () => {
      const { wrapper } = mountWith()
      wrapper.setData({ cameraActive: false, micActive: true })
      expect(wrapper.vm.joinHint).toBe('videoCall.prejoin.hintCamera')
    })

    it('returns empty when both are active', () => {
      const { wrapper } = mountWith()
      wrapper.setData({ cameraActive: true, micActive: true })
      expect(wrapper.vm.joinHint).toBe('')
    })
  })

  describe('hasVideo computed', () => {
    it('is false when no stream', () => {
      const { wrapper } = mountWith()
      wrapper.setData({ stream: null })
      expect(wrapper.vm.hasVideo).toBe(false)
    })

    it('is true when stream has video tracks', () => {
      const { wrapper } = mountWith()
      wrapper.setData({
        stream: {
          getVideoTracks: () => [{}],
          getAudioTracks: () => [],
          getTracks: () => [],
        },
      })
      expect(wrapper.vm.hasVideo).toBe(true)
    })
  })

  describe('emitJoin', () => {
    it('emits a payload aligned with the toggle state', async () => {
      const { wrapper } = mountWith()
      wrapper.setData({
        cameraActive: true,
        micActive: true,
        cameraStatus: 'granted',
        micStatus: 'granted',
        selectedCamera: 'cam-1',
        selectedMic: 'mic-1',
        selectedSpeaker: 'spk-1',
      })
      await wrapper.vm.$nextTick()
      wrapper.vm.emitJoin()
      const payload = wrapper.emitted('join')[0][0]
      expect(payload).toMatchObject({
        cameraDeviceId: 'cam-1',
        micDeviceId: 'mic-1',
        cameraEnabled: true,
        micEnabled: true,
      })
    })

    it('treats prompt-status as enabled (Safari fallback)', async () => {
      const { wrapper } = mountWith()
      wrapper.setData({
        cameraActive: true,
        micActive: true,
        cameraStatus: 'prompt',
        micStatus: 'prompt',
        selectedCamera: 'cam-1',
        selectedMic: 'mic-1',
      })
      await wrapper.vm.$nextTick()
      wrapper.vm.emitJoin()
      const payload = wrapper.emitted('join')[0][0]
      expect(payload.cameraEnabled).toBe(true)
      expect(payload.micEnabled).toBe(true)
    })

    it('disables when status is denied', async () => {
      const { wrapper } = mountWith()
      wrapper.setData({
        cameraActive: true,
        micActive: true,
        cameraStatus: 'denied',
        micStatus: 'denied',
        selectedCamera: 'cam-1',
        selectedMic: 'mic-1',
      })
      await wrapper.vm.$nextTick()
      wrapper.vm.emitJoin()
      const payload = wrapper.emitted('join')[0][0]
      expect(payload.cameraEnabled).toBe(false)
      expect(payload.micEnabled).toBe(false)
      expect(payload.cameraDeviceId).toBeNull()
      expect(payload.micDeviceId).toBeNull()
    })
  })

  describe('permissionMessage', () => {
    it.each([
      ['NotAllowedError', 'videoCall.prejoin.errorDenied'],
      ['SecurityError', 'videoCall.prejoin.errorDenied'],
      ['NotFoundError', 'videoCall.prejoin.errorNoDevice'],
      ['OverconstrainedError', 'videoCall.prejoin.errorNoDevice'],
      ['NotReadableError', 'videoCall.prejoin.errorBusy'],
      ['SomethingElse', 'videoCall.prejoin.errorUnknown'],
    ])('maps %s to the matching i18n key', (name, key) => {
      const { wrapper } = mountWith()
      expect(wrapper.vm.permissionMessage({ name })).toBe(key)
    })

    it('returns the unknown key for falsy errors', () => {
      const { wrapper } = mountWith()
      expect(wrapper.vm.permissionMessage(null)).toBe('videoCall.prejoin.errorUnknown')
    })
  })

  describe('enumerate', () => {
    it('drops stale selections that are no longer enumerated', async () => {
      const mediaDevices = {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [],
          getAudioTracks: () => [],
          getVideoTracks: () => [],
        }),
        enumerateDevices: jest.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam-new' },
          { kind: 'audioinput', deviceId: 'mic-new' },
        ]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      const { wrapper } = mountWith(mediaDevices)
      wrapper.setData({
        selectedCamera: 'cam-gone',
        selectedMic: 'mic-gone',
        selectedSpeaker: 'spk-gone',
      })
      await wrapper.vm.enumerate()
      expect(wrapper.vm.selectedCamera).toBe('cam-new')
      expect(wrapper.vm.selectedMic).toBe('mic-new')
      expect(wrapper.vm.selectedSpeaker).toBe('')
    })

    it('preserves selections that still exist', async () => {
      const mediaDevices = {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [],
          getAudioTracks: () => [],
          getVideoTracks: () => [],
        }),
        enumerateDevices: jest.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam-1' },
          { kind: 'videoinput', deviceId: 'cam-2' },
        ]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      const { wrapper } = mountWith(mediaDevices)
      wrapper.setData({ selectedCamera: 'cam-2' })
      await wrapper.vm.enumerate()
      expect(wrapper.vm.selectedCamera).toBe('cam-2')
    })

    it('swallows enumerateDevices errors', async () => {
      const mediaDevices = {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [],
          getAudioTracks: () => [],
          getVideoTracks: () => [],
        }),
        enumerateDevices: jest.fn().mockRejectedValue(new Error('boom')),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      const { wrapper } = mountWith(mediaDevices)
      await expect(wrapper.vm.enumerate()).resolves.toBeUndefined()
    })
  })

  describe('initDevices', () => {
    it('flags an unsupported browser when mediaDevices is missing', async () => {
      const { wrapper } = mountWith()
      await wrapper.vm.$nextTick()
      // After the real mount completed, drop mediaDevices and run initDevices
      // again so we hit the "unsupported browser" branch deterministically.
      const original = Object.getOwnPropertyDescriptor(global.navigator, 'mediaDevices')
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      })
      try {
        await wrapper.vm.initDevices()
        expect(wrapper.vm.cameraStatus).toBe('unsupported')
        expect(wrapper.vm.micStatus).toBe('unsupported')
        expect(wrapper.vm.cameraActive).toBe(false)
        expect(wrapper.vm.micActive).toBe(false)
      } finally {
        if (original) Object.defineProperty(global.navigator, 'mediaDevices', original)
      }
    })

    it('catches acquireStream errors and stores the permission message', async () => {
      const err = Object.assign(new Error('denied'), { name: 'NotAllowedError' })
      const mediaDevices = {
        getUserMedia: jest.fn().mockRejectedValue(err),
        enumerateDevices: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      const { wrapper } = mountWith(mediaDevices)
      // We mounted with a no-op mounted hook; drive initDevices manually.
      await wrapper.vm.initDevices()
      expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorDenied')
    })
  })

  describe('refreshPermissionStatus', () => {
    it('falls back to prompt when permissions API is missing', async () => {
      // mountWith() installs a rejecting permissions mock; override it AFTER
      // mount so refreshPermissionStatus actually sees the missing API.
      const { wrapper } = mountWith()
      const original = Object.getOwnPropertyDescriptor(global.navigator, 'permissions')
      Object.defineProperty(global.navigator, 'permissions', {
        value: undefined,
        configurable: true,
      })
      try {
        await wrapper.vm.refreshPermissionStatus()
        expect(wrapper.vm.cameraStatus).toBe('prompt')
        expect(wrapper.vm.micStatus).toBe('prompt')
      } finally {
        if (original) Object.defineProperty(global.navigator, 'permissions', original)
      }
    })

    it('reads granted status when the Permissions API is available', async () => {
      const status = {
        state: 'granted',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      const { wrapper } = mountWith()
      // mountWith installs a rejecting permissions mock — override after mount.
      Object.defineProperty(global.navigator, 'permissions', {
        value: { query: jest.fn().mockResolvedValue(status) },
        configurable: true,
      })
      await wrapper.vm.refreshPermissionStatus()
      expect(wrapper.vm.cameraStatus).toBe('granted')
      expect(wrapper.vm.micStatus).toBe('granted')
      expect(status.addEventListener).toHaveBeenCalled()
    })
  })

  describe('permission listeners', () => {
    it('attachPermissionListener wires a fresh status and reacts on change', async () => {
      const { wrapper } = mountWith()
      let handler
      const status = {
        state: 'prompt',
        addEventListener: jest.fn((_evt, h) => {
          handler = h
        }),
        removeEventListener: jest.fn(),
      }
      wrapper.vm.attachPermissionListener('camera', status)
      expect(status.addEventListener).toHaveBeenCalled()
      // Trigger the handler to exercise onPermissionChange.
      status.state = 'denied'
      handler()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.cameraStatus).toBe('denied')
    })

    it('is a no-op when status is missing', () => {
      const { wrapper } = mountWith()
      expect(() => wrapper.vm.attachPermissionListener('mic', null)).not.toThrow()
    })

    it('skips re-attach when the same status is already wired', () => {
      const { wrapper } = mountWith()
      const status = {
        state: 'granted',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      wrapper.vm.attachPermissionListener('camera', status)
      status.addEventListener.mockClear()
      wrapper.vm.attachPermissionListener('camera', status)
      expect(status.addEventListener).not.toHaveBeenCalled()
    })

    it('detachPermissionListeners is safe when none were attached', () => {
      const { wrapper } = mountWith()
      expect(() => wrapper.vm.detachPermissionListeners()).not.toThrow()
    })

    it('detaches a previously attached listener on destroy', () => {
      const { wrapper } = mountWith()
      const status = {
        state: 'granted',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      wrapper.vm.attachPermissionListener('camera', status)
      wrapper.destroy()
      expect(status.removeEventListener).toHaveBeenCalled()
    })
  })

  describe('onPermissionChange', () => {
    it('re-acquires the stream and clears the error when granted', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      wrapper.vm.enumerate = jest.fn().mockResolvedValue()
      wrapper.setData({ permissionError: 'old' })
      await wrapper.vm.onPermissionChange('camera', 'granted')
      expect(wrapper.vm.cameraActive).toBe(true)
      expect(wrapper.vm.permissionError).toBeNull()
    })

    it('falls back to permissionMessage when re-acquire fails', async () => {
      const err = Object.assign(new Error('boom'), { name: 'NotReadableError' })
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockRejectedValue(err)
      wrapper.vm.enumerate = jest.fn().mockResolvedValue()
      await wrapper.vm.onPermissionChange('microphone', 'granted')
      expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorBusy')
    })

    it('disables the input and re-acquires when denied', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      await wrapper.vm.onPermissionChange('camera', 'denied')
      expect(wrapper.vm.cameraActive).toBe(false)
    })

    it('swallows acquireStream errors in the denied path', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockRejectedValue(new Error('boom'))
      await expect(wrapper.vm.onPermissionChange('microphone', 'denied')).resolves.toBeUndefined()
    })
  })

  describe('retry', () => {
    it('clears the error after a successful acquireStream', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      wrapper.vm.refreshPermissionStatus = jest.fn().mockResolvedValue()
      wrapper.vm.enumerate = jest.fn().mockResolvedValue()
      wrapper.setData({ permissionError: 'old' })
      await wrapper.vm.retry()
      expect(wrapper.vm.permissionError).toBeNull()
    })

    it('disables active flags if status came back denied', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      wrapper.vm.refreshPermissionStatus = jest.fn().mockImplementation(() => {
        wrapper.setData({ cameraStatus: 'denied', micStatus: 'denied' })
        return Promise.resolve()
      })
      wrapper.vm.enumerate = jest.fn().mockResolvedValue()
      await wrapper.vm.retry()
      expect(wrapper.vm.cameraActive).toBe(false)
      expect(wrapper.vm.micActive).toBe(false)
    })

    it('falls back to permissionMessage on failure', async () => {
      const err = Object.assign(new Error('x'), { name: 'NotAllowedError' })
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockRejectedValue(err)
      await wrapper.vm.retry()
      expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorDenied')
    })
  })

  describe('acquireStream', () => {
    it('returns early when neither cam nor mic is wanted', async () => {
      const { wrapper, mediaDevices } = mountWith()
      mediaDevices.getUserMedia.mockClear()
      wrapper.setData({ cameraActive: false, micActive: false })
      await wrapper.vm.acquireStream()
      expect(mediaDevices.getUserMedia).not.toHaveBeenCalled()
      expect(wrapper.vm.stream).toBeNull()
    })

    it('falls back to audio-only when video fails but audio was wanted', async () => {
      const audioStream = {
        getTracks: () => [],
        getAudioTracks: () => [{}],
        getVideoTracks: () => [],
      }
      const mediaDevices = {
        getUserMedia: jest
          .fn()
          .mockRejectedValueOnce(Object.assign(new Error(), { name: 'NotFoundError' }))
          .mockResolvedValueOnce(audioStream),
        enumerateDevices: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      const { wrapper } = mountWith(mediaDevices)
      wrapper.setData({
        cameraActive: true,
        micActive: true,
        cameraStatus: 'granted',
        micStatus: 'granted',
        selectedMic: 'mic-1',
      })
      await wrapper.vm.acquireStream()
      expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.stream).toBe(audioStream)
    })

    it('rethrows the original error if both attempts fail', async () => {
      const original = Object.assign(new Error('vid-fail'), { name: 'NotReadableError' })
      const mediaDevices = {
        getUserMedia: jest.fn().mockRejectedValue(original),
        enumerateDevices: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      const { wrapper } = mountWith(mediaDevices)
      wrapper.setData({
        cameraActive: true,
        micActive: true,
        cameraStatus: 'granted',
        micStatus: 'granted',
      })
      await expect(wrapper.vm.acquireStream()).rejects.toBe(original)
    })
  })

  describe('device selection handlers', () => {
    it('onCameraChange updates selectedCamera and triggers acquireStream', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      await wrapper.vm.onCameraChange({ target: { value: 'cam-2' } })
      expect(wrapper.vm.selectedCamera).toBe('cam-2')
      expect(wrapper.vm.acquireStream).toHaveBeenCalled()
    })

    it('onCameraChange records permission message on failure', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('x'), { name: 'NotFoundError' }))
      await wrapper.vm.onCameraChange({ target: { value: 'cam-2' } })
      expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorNoDevice')
    })

    it('onMicChange updates selectedMic and triggers acquireStream', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      await wrapper.vm.onMicChange({ target: { value: 'mic-2' } })
      expect(wrapper.vm.selectedMic).toBe('mic-2')
    })

    it('onMicChange records permission message on failure', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
      await wrapper.vm.onMicChange({ target: { value: 'mic-2' } })
      expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorDenied')
    })

    it('onSpeakerChange forwards setSinkId when supported', async () => {
      // Stub the prototype BEFORE mount so the speakerSupported computed
      // sees the function on its first (cached) evaluation.
      const originalSetSinkId = HTMLMediaElement.prototype.setSinkId
      HTMLMediaElement.prototype.setSinkId = function () {
        return Promise.resolve()
      }
      try {
        const { wrapper } = mountWith()
        const setSinkId = jest.fn().mockResolvedValue()
        wrapper.vm.$refs.speakerTestEl = { setSinkId }
        wrapper.setData({ selectedSpeaker: '' })
        await wrapper.vm.onSpeakerChange({ target: { value: 'spk-1' } })
        expect(wrapper.vm.selectedSpeaker).toBe('spk-1')
        expect(setSinkId).toHaveBeenCalledWith('spk-1')
      } finally {
        if (originalSetSinkId === undefined) {
          delete HTMLMediaElement.prototype.setSinkId
        } else {
          HTMLMediaElement.prototype.setSinkId = originalSetSinkId
        }
      }
    })

    it('onSpeakerChange swallows setSinkId rejection', async () => {
      const originalSetSinkId = HTMLMediaElement.prototype.setSinkId
      HTMLMediaElement.prototype.setSinkId = function () {
        return Promise.resolve()
      }
      try {
        const { wrapper } = mountWith()
        wrapper.vm.$refs.speakerTestEl = {
          setSinkId: jest.fn().mockRejectedValue(new Error('boom')),
        }
        wrapper.setData({ selectedSpeaker: '' })
        await expect(
          wrapper.vm.onSpeakerChange({ target: { value: 'spk-1' } }),
        ).resolves.toBeUndefined()
        expect(wrapper.vm.selectedSpeaker).toBe('spk-1')
      } finally {
        if (originalSetSinkId === undefined) {
          delete HTMLMediaElement.prototype.setSinkId
        } else {
          HTMLMediaElement.prototype.setSinkId = originalSetSinkId
        }
      }
    })
  })

  describe('toggleMicActive / toggleCameraActive', () => {
    it('is a no-op when mic is denied', async () => {
      const { wrapper } = mountWith()
      wrapper.setData({ micStatus: 'denied', micActive: false })
      wrapper.vm.acquireStream = jest.fn()
      await wrapper.vm.toggleMicActive()
      expect(wrapper.vm.acquireStream).not.toHaveBeenCalled()
    })

    it('flips micActive on success', async () => {
      const { wrapper } = mountWith()
      wrapper.setData({ micStatus: 'granted', micActive: false })
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      wrapper.vm.refreshPermissionStatus = jest.fn().mockResolvedValue()
      await wrapper.vm.toggleMicActive()
      expect(wrapper.vm.micActive).toBe(true)
    })

    it('rolls back micActive when acquire fails', async () => {
      const err = Object.assign(new Error('x'), { name: 'NotReadableError' })
      const { wrapper } = mountWith()
      wrapper.setData({ micStatus: 'granted', micActive: false })
      wrapper.vm.acquireStream = jest.fn().mockRejectedValue(err)
      await wrapper.vm.toggleMicActive()
      expect(wrapper.vm.micActive).toBe(false)
      expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorBusy')
    })

    it('flips cameraActive on success', async () => {
      const { wrapper } = mountWith()
      wrapper.setData({ cameraStatus: 'granted', cameraActive: false })
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      wrapper.vm.refreshPermissionStatus = jest.fn().mockResolvedValue()
      await wrapper.vm.toggleCameraActive()
      expect(wrapper.vm.cameraActive).toBe(true)
    })

    it('rolls back cameraActive when acquire fails', async () => {
      const err = Object.assign(new Error('x'), { name: 'NotAllowedError' })
      const { wrapper } = mountWith()
      wrapper.setData({ cameraStatus: 'granted', cameraActive: false })
      wrapper.vm.acquireStream = jest.fn().mockRejectedValue(err)
      await wrapper.vm.toggleCameraActive()
      expect(wrapper.vm.cameraActive).toBe(false)
      expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorDenied')
    })
  })

  describe('stopStream', () => {
    it('stops every track on the current stream and clears it', () => {
      const { wrapper } = mountWith()
      const stop = jest.fn()
      const stream = {
        getTracks: () => [{ stop }, { stop }],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
      }
      wrapper.setData({ stream })
      wrapper.vm.$refs.previewEl = { srcObject: stream }
      wrapper.vm.stopStream()
      expect(stop).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.stream).toBeNull()
    })
  })

  describe('startMeter / stopMeter', () => {
    it('is a no-op when the stream has no audio tracks', () => {
      const { wrapper } = mountWith()
      expect(() =>
        wrapper.vm.startMeter({ getAudioTracks: () => [], getVideoTracks: () => [] }),
      ).not.toThrow()
    })

    it('stopMeter closes the audio context and resets the meter', async () => {
      const { wrapper } = mountWith()
      const close = jest.fn()
      wrapper.vm.audioCtx = { close }
      wrapper.vm.meterRaf = 1
      // Polyfill cancelAnimationFrame if needed.
      const original = global.cancelAnimationFrame
      global.cancelAnimationFrame = jest.fn()
      wrapper.vm.stopMeter()
      expect(close).toHaveBeenCalled()
      expect(wrapper.vm.audioCtx).toBeNull()
      expect(wrapper.vm.meterRaf).toBeNull()
      expect(wrapper.vm.micLevelPercent).toBe(0)
      global.cancelAnimationFrame = original
    })

    it('stopMeter swallows close errors', () => {
      const { wrapper } = mountWith()
      wrapper.vm.audioCtx = {
        close: () => {
          throw new Error('boom')
        },
      }
      expect(() => wrapper.vm.stopMeter()).not.toThrow()
    })
  })

  describe('playTestTone', () => {
    it('exits early on a re-entry', async () => {
      const { wrapper } = mountWith()
      const ACSpy = jest.fn()
      const originalAC = window.AudioContext
      window.AudioContext = ACSpy
      try {
        wrapper.setData({ testingTone: true })
        await wrapper.vm.playTestTone()
        // testingTone should remain true (no reset) and no AudioContext built.
        expect(wrapper.vm.testingTone).toBe(true)
        expect(ACSpy).not.toHaveBeenCalled()
      } finally {
        window.AudioContext = originalAC
      }
    })

    it('exits when AudioContext is unavailable', async () => {
      const { wrapper } = mountWith()
      const originalAC = window.AudioContext
      const originalWAC = window.webkitAudioContext
      window.AudioContext = undefined
      window.webkitAudioContext = undefined
      await wrapper.vm.playTestTone()
      expect(wrapper.vm.testingTone).toBe(false)
      window.AudioContext = originalAC
      window.webkitAudioContext = originalWAC
    })
  })
})
