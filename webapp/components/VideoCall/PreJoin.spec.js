import Vuex from 'vuex'
import { mount, createLocalVue } from '@vue/test-utils'
import flushPromises from 'flush-promises'
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
  OsSpinner: Stub('OsSpinner'),
  AvatarImage: Stub('AvatarImage'),
}

// jsdom has no MediaStream. Tracks are plain objects carrying a `kind`.
class FakeMediaStream {
  constructor(tracks = []) {
    this.tracks = tracks
  }

  getTracks() {
    return this.tracks
  }

  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio')
  }

  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video')
  }
}
const fakeTrack = (kind, deviceId) => ({
  kind,
  stop: jest.fn(),
  getSettings: () => ({ deviceId }),
})
const useFakeMediaStream = () => {
  const original = global.MediaStream
  beforeEach(() => {
    global.MediaStream = FakeMediaStream
  })
  afterEach(() => {
    global.MediaStream = original
  })
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

    it('passes the selected devices along even while they are switched off', async () => {
      const { wrapper } = mountWith()
      wrapper.setData({
        cameraActive: false,
        micActive: false,
        cameraStatus: 'granted',
        micStatus: 'granted',
        selectedCamera: 'cam-1',
        selectedMic: 'mic-1',
      })
      await wrapper.vm.$nextTick()
      wrapper.vm.emitJoin()
      expect(wrapper.emitted('join')[0][0]).toMatchObject({
        cameraDeviceId: 'cam-1',
        micDeviceId: 'mic-1',
        speakerDeviceId: null,
        cameraEnabled: false,
        micEnabled: false,
      })
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

    it('acquires only what was granted: the microphone alone, the camera with it', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      wrapper.vm.enumerate = jest.fn().mockResolvedValue()
      await wrapper.vm.onPermissionChange('microphone', 'granted')
      expect(wrapper.vm.acquireStream).toHaveBeenLastCalledWith('audio')
      await wrapper.vm.onPermissionChange('camera', 'granted')
      expect(wrapper.vm.acquireStream).toHaveBeenLastCalledWith('video')
    })

    it('leaves a running capture alone when the browser reports its own grant', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      wrapper.setData({
        permissionError: 'camera failed',
        stream: {
          getTracks: () => [{ kind: 'video' }],
          getAudioTracks: () => [],
          getVideoTracks: () => [{ kind: 'video' }],
        },
      })
      await wrapper.vm.onPermissionChange('camera', 'granted')
      expect(wrapper.vm.cameraStatus).toBe('granted')
      expect(wrapper.vm.acquireStream).not.toHaveBeenCalled()
      expect(wrapper.vm.permissionError).toBe('camera failed')

      // No microphone in that stream, so its grant is worth acting on.
      wrapper.vm.enumerate = jest.fn().mockResolvedValue()
      await wrapper.vm.onPermissionChange('microphone', 'granted')
      expect(wrapper.vm.acquireStream).toHaveBeenCalledWith('audio')
    })

    it('leaves a capture alone that is still starting', async () => {
      let grant
      const getUserMedia = jest.fn(
        () =>
          new Promise((resolve) => {
            grant = resolve
          }),
      )
      const { wrapper } = mountWith({
        getUserMedia,
        enumerateDevices: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })
      wrapper.setData({ cameraStatus: 'prompt', micStatus: 'prompt' })
      const starting = wrapper.vm.acquireStream()

      await wrapper.vm.onPermissionChange('camera', 'granted')
      await wrapper.vm.onPermissionChange('microphone', 'granted')
      expect(getUserMedia).toHaveBeenCalledTimes(1)

      const stream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] }
      grant(stream)
      await expect(starting).resolves.toBe(true)
      expect(wrapper.vm.stream).toBe(stream)
      expect(wrapper.vm.starting).toEqual({ video: 0, audio: 0 })
    })

    it('disables the input and stops only its capture when denied', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      await wrapper.vm.onPermissionChange('camera', 'denied')
      expect(wrapper.vm.cameraActive).toBe(false)
      expect(wrapper.vm.acquireStream).toHaveBeenCalledWith('video')
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

  describe('acquireStream overtaken by a newer request', () => {
    const fakeStream = (name) => {
      const track = { stop: jest.fn() }
      return {
        name,
        track,
        getTracks: () => [track],
        getAudioTracks: () => [],
        getVideoTracks: () => [track],
      }
    }
    const deferred = () => {
      let resolve, reject
      const promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }
    const mountPending = (...pending) => {
      const getUserMedia = jest.fn()
      pending.forEach((p) => getUserMedia.mockReturnValueOnce(p.promise))
      const built = mountWith({
        getUserMedia,
        enumerateDevices: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })
      built.wrapper.setData({ cameraStatus: 'granted', micStatus: 'granted' })
      return built
    }

    it('keeps the camera picked last when a slow one starts after it', async () => {
      const slow = deferred()
      const fast = deferred()
      const { wrapper } = mountPending(slow, fast)
      const iphone = fakeStream('iphone')
      const builtIn = fakeStream('built-in')

      wrapper.setData({ selectedCamera: 'iphone' })
      const first = wrapper.vm.acquireStream()
      wrapper.setData({ selectedCamera: 'built-in' })
      const second = wrapper.vm.acquireStream()
      fast.resolve(builtIn)
      await expect(second).resolves.toBe(true)
      slow.resolve(iphone)
      await expect(first).resolves.toBe(false)

      expect(wrapper.vm.stream).toBe(builtIn)
      expect(iphone.track.stop).toHaveBeenCalled()
      expect(builtIn.track.stop).not.toHaveBeenCalled()
    })

    it('ignores the failure of an overtaken request', async () => {
      const slow = deferred()
      const fast = deferred()
      const { wrapper } = mountPending(slow, fast)
      const first = wrapper.vm.acquireStream()
      const second = wrapper.vm.acquireStream()
      fast.resolve(fakeStream('built-in'))
      await second
      slow.reject(Object.assign(new Error(), { name: 'NotReadableError' }))
      await expect(first).resolves.toBe(false)
      expect(wrapper.vm.permissionError).toBeNull()
    })

    it('ignores an overtaken request whose audio fallback fails too', async () => {
      const video = deferred()
      const audio = deferred()
      const { wrapper } = mountPending(video, audio)
      const first = wrapper.vm.acquireStream()
      video.reject(new Error('video'))
      await flushPromises()
      wrapper.vm.streamRequests.video++
      wrapper.vm.streamRequests.audio++
      audio.reject(new Error('audio'))
      await expect(first).resolves.toBe(false)
    })

    it('hands back a camera that starts only after the dialog is gone', async () => {
      const slow = deferred()
      const { wrapper } = mountPending(slow)
      const iphone = fakeStream('iphone')
      const pending = wrapper.vm.acquireStream()
      wrapper.destroy()
      slow.resolve(iphone)
      await expect(pending).resolves.toBe(false)
      expect(iphone.track.stop).toHaveBeenCalled()
    })
  })

  describe('a chosen camera that fails while the microphone works', () => {
    const audioStream = {
      getTracks: () => [],
      getAudioTracks: () => [{}],
      getVideoTracks: () => [],
    }
    const mountFailingCamera = (selectedCamera) => {
      const built = mountWith({
        getUserMedia: jest
          .fn()
          .mockRejectedValueOnce(Object.assign(new Error(), { name: 'NotReadableError' }))
          .mockResolvedValueOnce(audioStream),
        enumerateDevices: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })
      built.wrapper.setData({ cameraStatus: 'granted', micStatus: 'granted', selectedCamera })
      return built
    }

    it('says why there is no picture', async () => {
      const { wrapper } = mountFailingCamera('cam-2')
      await expect(wrapper.vm.acquireStream()).resolves.toBe(true)
      expect(wrapper.vm.stream).toBe(audioStream)
      expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorBusy')
    })

    it('stays quiet when no camera was chosen — there may be none', async () => {
      const { wrapper } = mountFailingCamera('')
      await wrapper.vm.acquireStream()
      expect(wrapper.vm.stream).toBe(audioStream)
      expect(wrapper.vm.permissionError).toBeNull()
    })
  })

  describe('changing one device leaves the other capture alone', () => {
    useFakeMediaStream()

    const deferred = () => {
      let resolve
      const promise = new Promise((res) => {
        resolve = res
      })
      return { promise, resolve }
    }
    const mountCapturing = (getUserMedia) => {
      const built = mountWith({
        getUserMedia,
        enumerateDevices: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })
      const video = fakeTrack('video', 'cam-1')
      const audio = fakeTrack('audio', 'mic-1')
      built.wrapper.setData({
        cameraStatus: 'granted',
        micStatus: 'granted',
        selectedCamera: 'cam-1',
        selectedMic: 'mic-1',
        stream: new FakeMediaStream([video, audio]),
      })
      return { ...built, video, audio }
    }

    it('asks for the microphone only when the microphone changes', async () => {
      const headset = fakeTrack('audio', 'mic-2')
      const getUserMedia = jest.fn().mockResolvedValue(new FakeMediaStream([headset]))
      const { wrapper, video, audio } = mountCapturing(getUserMedia)
      const preview = { srcObject: 'the running picture' }
      wrapper.vm.$refs.previewEl = preview

      await wrapper.vm.onMicChange('mic-2')
      await wrapper.vm.$nextTick()
      expect(getUserMedia).toHaveBeenCalledWith({
        video: false,
        audio: { deviceId: { exact: 'mic-2' } },
      })
      expect(audio.stop).toHaveBeenCalled()
      expect(video.stop).not.toHaveBeenCalled()
      expect(wrapper.vm.stream.getTracks()).toEqual([video, headset])
      expect(preview.srcObject).toBe('the running picture')
    })

    it('asks for the camera only when the camera changes', async () => {
      const webcam = fakeTrack('video', 'cam-2')
      const getUserMedia = jest.fn().mockResolvedValue(new FakeMediaStream([webcam]))
      const { wrapper, video, audio } = mountCapturing(getUserMedia)
      const preview = { srcObject: 'the old picture' }
      wrapper.vm.$refs.previewEl = preview

      await wrapper.vm.onCameraChange('cam-2')
      await wrapper.vm.$nextTick()
      expect(getUserMedia).toHaveBeenCalledWith({
        video: { deviceId: { exact: 'cam-2' } },
        audio: false,
      })
      expect(video.stop).toHaveBeenCalled()
      expect(audio.stop).not.toHaveBeenCalled()
      expect(wrapper.vm.stream.getTracks()).toEqual([audio, webcam])
      expect(preview.srcObject).toBe(wrapper.vm.stream)
    })

    it('switching the microphone off keeps the picture, and the other way round', async () => {
      const getUserMedia = jest.fn()
      const { wrapper, video, audio } = mountCapturing(getUserMedia)
      wrapper.vm.refreshPermissionStatus = jest.fn().mockResolvedValue()

      await wrapper.vm.toggleMicActive()
      expect(wrapper.vm.stream.getTracks()).toEqual([video])
      expect(audio.stop).toHaveBeenCalled()

      await wrapper.vm.toggleCameraActive()
      expect(wrapper.vm.stream).toBeNull()
      expect(video.stop).toHaveBeenCalled()
      expect(getUserMedia).not.toHaveBeenCalled()

      // Nothing left to stop.
      await expect(wrapper.vm.acquireStream('video')).resolves.toBe(true)
    })

    it('keeps a new microphone that was picked while a slow camera was starting', async () => {
      const slowCamera = deferred()
      const headset = fakeTrack('audio', 'mic-2')
      const getUserMedia = jest
        .fn()
        .mockReturnValueOnce(slowCamera.promise)
        .mockResolvedValueOnce(new FakeMediaStream([headset]))
      const { wrapper } = mountCapturing(getUserMedia)
      wrapper.setData({ stream: null })

      const both = wrapper.vm.acquireStream()
      await wrapper.vm.onMicChange('mic-2')
      const iphone = fakeTrack('video', 'iphone')
      const overtakenMic = fakeTrack('audio', 'mic-1')
      slowCamera.resolve(new FakeMediaStream([iphone, overtakenMic]))

      // Half of it was overtaken: the camera goes on show, its microphone back.
      await expect(both).resolves.toBe(false)
      expect(overtakenMic.stop).toHaveBeenCalled()
      expect(wrapper.vm.stream.getTracks()).toEqual([headset, iphone])
    })
  })

  describe('a camera that takes its time to start', () => {
    const STARTING = '[data-test="prejoin-camera-starting"]'
    const mountStarting = () => {
      let grant, refuse
      const getUserMedia = jest.fn(
        () =>
          new Promise((resolve, reject) => {
            grant = resolve
            refuse = reject
          }),
      )
      const built = mountWith({
        getUserMedia,
        enumerateDevices: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })
      built.wrapper.setData({ cameraStatus: 'granted', micStatus: 'granted' })
      return { ...built, grant: (s) => grant(s), refuse: (e) => refuse(e) }
    }
    const placeholder = (wrapper) => wrapper.find('.prejoin__placeholder-text').text()

    it('says so in the preview until the picture is there', async () => {
      const { wrapper, grant } = mountStarting()
      expect(placeholder(wrapper)).toBe('videoCall.prejoin.noCamera')

      const starting = wrapper.vm.acquireStream()
      await wrapper.vm.$nextTick()
      expect(wrapper.find(STARTING).exists()).toBe(true)
      expect(wrapper.find('.stub-avatarimage').exists()).toBe(false)
      expect(placeholder(wrapper)).toBe('videoCall.prejoin.cameraStarting')

      grant({ getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [{}] })
      await starting
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.prejoin__placeholder').exists()).toBe(false)
    })

    it('goes back to the plain placeholder when the camera does not come', async () => {
      const { wrapper, refuse } = mountStarting()
      wrapper.setData({ micActive: false })
      const starting = wrapper.vm.acquireStream()
      await wrapper.vm.$nextTick()
      expect(wrapper.find(STARTING).exists()).toBe(true)

      refuse(new Error('boom'))
      await expect(starting).rejects.toThrow('boom')
      await wrapper.vm.$nextTick()
      expect(wrapper.find(STARTING).exists()).toBe(false)
      expect(placeholder(wrapper)).toBe('videoCall.prejoin.noCamera')
    })

    it('names the camera that is starting, once the browser has named it', async () => {
      const { wrapper } = mountStarting()
      const NAME = '[data-test="prejoin-camera-starting-name"]'
      wrapper.vm.acquireStream('video')
      await wrapper.vm.$nextTick()
      expect(wrapper.find(NAME).exists()).toBe(false)

      wrapper.setData({
        cameras: [
          { deviceId: 'cam-1', label: 'Built-in camera' },
          { deviceId: 'cam-2', label: '' },
        ],
        selectedCamera: 'cam-1',
      })
      await wrapper.vm.$nextTick()
      expect(wrapper.find(NAME).text()).toBe('Built-in camera')

      wrapper.setData({ selectedCamera: 'cam-2' })
      await wrapper.vm.$nextTick()
      expect(wrapper.find(NAME).exists()).toBe(false)
    })

    it('shows the camera sign only for the camera', async () => {
      const { wrapper } = mountStarting()
      wrapper.vm.acquireStream('audio')
      await wrapper.vm.$nextTick()
      expect(wrapper.find(STARTING).exists()).toBe(false)

      wrapper.setData({ cameraActive: false })
      wrapper.vm.acquireStream('video')
      await wrapper.vm.$nextTick()
      expect(wrapper.find(STARTING).exists()).toBe(false)
      expect(placeholder(wrapper)).toBe('videoCall.prejoin.cameraDisabled')
    })
  })

  describe('a microphone that takes its time to start', () => {
    const MIC_STARTING = '[data-test="prejoin-mic-starting"]'
    const mountStarting = () => {
      let grant
      const getUserMedia = jest.fn(
        () =>
          new Promise((resolve) => {
            grant = resolve
          }),
      )
      const built = mountWith({
        getUserMedia,
        enumerateDevices: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })
      built.wrapper.setData({
        cameraStatus: 'granted',
        micStatus: 'granted',
        mics: [{ deviceId: 'mic-2', label: 'Headset' }],
      })
      return { ...built, grant: (s) => grant(s) }
    }

    it('says so at the bottom of the preview, with the name of the microphone', async () => {
      const { wrapper, grant } = mountStarting()
      expect(wrapper.find(MIC_STARTING).exists()).toBe(false)

      const starting = wrapper.vm.onMicChange('mic-2')
      await wrapper.vm.$nextTick()
      expect(wrapper.find(MIC_STARTING).text()).toContain('videoCall.prejoin.micStarting')
      expect(wrapper.find(MIC_STARTING).text()).toContain('Headset')
      // The camera is not what is starting.
      expect(wrapper.find('[data-test="prejoin-camera-starting"]').exists()).toBe(false)

      grant({ getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] })
      await starting
      await wrapper.vm.$nextTick()
      expect(wrapper.find(MIC_STARTING).exists()).toBe(false)
    })

    it('goes without a name while the browser has not named the microphone', async () => {
      const { wrapper } = mountStarting()
      wrapper.vm.acquireStream('audio')
      await wrapper.vm.$nextTick()
      expect(wrapper.find(MIC_STARTING).text()).toBe('videoCall.prejoin.micStarting')
    })

    it('stays away while only the camera starts', async () => {
      const { wrapper } = mountStarting()
      wrapper.vm.acquireStream('video')
      await wrapper.vm.$nextTick()
      expect(wrapper.find(MIC_STARTING).exists()).toBe(false)
    })
  })

  describe('device selection handlers', () => {
    it('onCameraChange updates selectedCamera and triggers acquireStream', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      await wrapper.vm.onCameraChange('cam-2')
      expect(wrapper.vm.selectedCamera).toBe('cam-2')
      expect(wrapper.vm.acquireStream).toHaveBeenCalled()
    })

    it('onCameraChange records permission message on failure', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('x'), { name: 'NotFoundError' }))
      await wrapper.vm.onCameraChange('cam-2')
      expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorNoDevice')
    })

    it('onMicChange updates selectedMic and triggers acquireStream', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue()
      await wrapper.vm.onMicChange('mic-2')
      expect(wrapper.vm.selectedMic).toBe('mic-2')
    })

    it('onMicChange records permission message on failure', async () => {
      const { wrapper } = mountWith()
      wrapper.vm.acquireStream = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
      await wrapper.vm.onMicChange('mic-2')
      expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorDenied')
    })

    it('onSpeakerChange updates selectedSpeaker', () => {
      const { wrapper } = mountWith()
      wrapper.vm.onSpeakerChange('spk-1')
      expect(wrapper.vm.selectedSpeaker).toBe('spk-1')
    })
  })

  describe('remembered devices', () => {
    const STORAGE_KEY = 'ocelot-video-call-devices'
    const DEVICES = [
      { kind: 'videoinput', deviceId: 'cam-1', label: 'Built-in camera' },
      { kind: 'videoinput', deviceId: 'cam-2', label: 'Webcam' },
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in microphone' },
      { kind: 'audioinput', deviceId: 'mic-2', label: 'Headset' },
      { kind: 'audiooutput', deviceId: 'spk-1', label: 'Built-in speaker' },
      { kind: 'audiooutput', deviceId: 'spk-2', label: 'Headset' },
    ]
    const stream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] }
    const mediaDevicesWith = (overrides = {}) => ({
      getUserMedia: jest.fn().mockResolvedValue(stream),
      enumerateDevices: jest.fn().mockResolvedValue(DEVICES),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      ...overrides,
    })
    const remember = (preferences) => localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    const remembered = () => JSON.parse(localStorage.getItem(STORAGE_KEY))

    beforeEach(() => {
      localStorage.clear()
    })

    it('asks for the devices of the last call right away and selects them', async () => {
      remember({
        videoinput: { deviceId: 'cam-2', label: 'Webcam' },
        audioinput: { deviceId: 'mic-2', label: 'Headset' },
        audiooutput: { deviceId: 'spk-2', label: 'Headset' },
      })
      const { wrapper, mediaDevices } = mountWith(mediaDevicesWith(), { runMounted: true })
      await flushPromises()
      expect(wrapper.vm.selectedCamera).toBe('cam-2')
      expect(wrapper.vm.selectedMic).toBe('mic-2')
      expect(wrapper.vm.selectedSpeaker).toBe('spk-2')
      // As a wish, not a demand: the device may be gone by now.
      expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
      expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { deviceId: { ideal: 'cam-2' } },
        audio: { deviceId: { ideal: 'mic-2' } },
      })
    })

    it('captures once when nothing is remembered', async () => {
      const { wrapper, mediaDevices } = mountWith(mediaDevicesWith(), { runMounted: true })
      await flushPromises()
      expect(wrapper.vm.selectedCamera).toBe('cam-1')
      expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
      expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true, audio: true })
    })

    describe('when the browser no longer knows a remembered device by its id', () => {
      useFakeMediaStream()

      // Safari: new ids every session, so the wish above matches nothing and
      // the capture comes up on the defaults.
      const defaults = () =>
        new FakeMediaStream([fakeTrack('video', 'cam-1'), fakeTrack('audio', 'mic-1')])

      it('restarts only the microphone when only that runs on another device', async () => {
        remember({ audioinput: { deviceId: 'old-id', label: 'Headset' } })
        const first = defaults()
        const headset = new FakeMediaStream([fakeTrack('audio', 'mic-2')])
        const getUserMedia = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(headset)
        const { wrapper } = mountWith(mediaDevicesWith({ getUserMedia }), { runMounted: true })
        await flushPromises()

        expect(wrapper.vm.selectedMic).toBe('mic-2')
        expect(getUserMedia).toHaveBeenLastCalledWith({
          video: false,
          audio: { deviceId: { exact: 'mic-2' } },
        })
        const [video] = first.getVideoTracks()
        expect(video.stop).not.toHaveBeenCalled()
        expect(wrapper.vm.stream.getTracks()).toEqual([video, headset.getTracks()[0]])
      })

      it('restarts only the camera when only that runs on another device', async () => {
        remember({ videoinput: { deviceId: 'old-id', label: 'Webcam' } })
        const first = defaults()
        const webcam = new FakeMediaStream([fakeTrack('video', 'cam-2')])
        const getUserMedia = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(webcam)
        const { wrapper } = mountWith(mediaDevicesWith({ getUserMedia }), { runMounted: true })
        await flushPromises()

        expect(wrapper.vm.selectedCamera).toBe('cam-2')
        expect(getUserMedia).toHaveBeenLastCalledWith({
          video: { deviceId: { exact: 'cam-2' } },
          audio: false,
        })
        const [audio] = first.getAudioTracks()
        expect(audio.stop).not.toHaveBeenCalled()
        expect(wrapper.vm.stream.getTracks()).toEqual([audio, webcam.getTracks()[0]])
      })

      it('restarts both when both run on another device', async () => {
        remember({
          videoinput: { deviceId: 'old-cam', label: 'Webcam' },
          audioinput: { deviceId: 'old-mic', label: 'Headset' },
        })
        const getUserMedia = jest.fn().mockResolvedValue(defaults())
        mountWith(mediaDevicesWith({ getUserMedia }), { runMounted: true })
        await flushPromises()
        expect(getUserMedia).toHaveBeenLastCalledWith({
          video: { deviceId: { exact: 'cam-2' } },
          audio: { deviceId: { exact: 'mic-2' } },
        })
      })

      it('reports a remembered device that fails to start', async () => {
        remember({ videoinput: { deviceId: 'old-id', label: 'Webcam' } })
        const getUserMedia = jest
          .fn()
          .mockResolvedValueOnce(defaults())
          .mockRejectedValue(Object.assign(new Error(), { name: 'NotReadableError' }))
        const { wrapper } = mountWith(mediaDevicesWith({ getUserMedia }), { runMounted: true })
        await flushPromises()
        expect(wrapper.vm.permissionError).toBe('videoCall.prejoin.errorBusy')
      })
    })

    it('selects the devices the capture really runs on, not the first of the list', async () => {
      const running = new FakeMediaStream([
        fakeTrack('video', 'cam-2'),
        fakeTrack('audio', 'mic-2'),
      ])
      const getUserMedia = jest.fn().mockResolvedValue(running)
      const { wrapper } = mountWith(mediaDevicesWith({ getUserMedia }), { runMounted: true })
      await flushPromises()
      expect(wrapper.vm.selectedCamera).toBe('cam-2')
      expect(wrapper.vm.selectedMic).toBe('mic-2')
      expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('keeps the first of the list when the running device is not in it', async () => {
      const running = new FakeMediaStream([fakeTrack('video', 'unlisted')])
      const getUserMedia = jest.fn().mockResolvedValue(running)
      const { wrapper } = mountWith(mediaDevicesWith({ getUserMedia }), { runMounted: true })
      await flushPromises()
      expect(wrapper.vm.selectedCamera).toBe('cam-1')
      expect(wrapper.vm.selectedMic).toBe('mic-1')
    })

    it('needs no new preview for a remembered speaker alone', async () => {
      remember({ audiooutput: { deviceId: 'spk-2', label: 'Headset' } })
      const { wrapper, mediaDevices } = mountWith(mediaDevicesWith(), { runMounted: true })
      await flushPromises()
      expect(wrapper.vm.selectedSpeaker).toBe('spk-2')
      expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('remembers a device the user picks', async () => {
      const { wrapper } = mountWith()
      wrapper.setData({
        cameras: DEVICES.slice(0, 2),
        mics: DEVICES.slice(2, 4),
        speakers: DEVICES.slice(4),
      })
      wrapper.setData({ cameraActive: false })
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue(true)
      await wrapper.vm.onCameraChange('cam-2')
      await wrapper.vm.onMicChange('mic-2')
      wrapper.vm.onSpeakerChange('spk-2')
      expect(remembered()).toEqual({
        videoinput: { deviceId: 'cam-2', label: 'Webcam' },
        audioinput: { deviceId: 'mic-2', label: 'Headset' },
        audiooutput: { deviceId: 'spk-2', label: 'Headset' },
      })
    })

    it('does not remember a device that failed to start', async () => {
      const { wrapper } = mountWith()
      wrapper.setData({ cameras: DEVICES.slice(0, 2) })
      wrapper.vm.acquireStream = jest.fn().mockRejectedValue(new Error('boom'))
      await wrapper.vm.onCameraChange('cam-2')
      expect(remembered()).toBeNull()
    })

    it('does not remember a choice that was overtaken or shows no picture', async () => {
      const { wrapper } = mountWith()
      wrapper.setData({ cameras: DEVICES.slice(0, 2), mics: DEVICES.slice(2, 4) })
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue(false)
      await wrapper.vm.onCameraChange('cam-2')
      await wrapper.vm.onMicChange('mic-2')
      expect(remembered()).toBeNull()

      // Camera switched on, yet the preview came back without a video track.
      wrapper.vm.acquireStream = jest.fn().mockResolvedValue(true)
      await wrapper.vm.onCameraChange('cam-2')
      expect(remembered()).toBeNull()

      wrapper.setData({
        stream: { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [{}] },
      })
      await wrapper.vm.onCameraChange('cam-2')
      expect(remembered().videoinput.deviceId).toBe('cam-2')
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

  describe('initDevices via mounted', () => {
    it('runs the full device init on mount and listens for device changes', async () => {
      const { mediaDevices } = mountWith(null, { runMounted: true })
      await flushPromises()
      expect(mediaDevices.getUserMedia).toHaveBeenCalled()
      expect(mediaDevices.addEventListener).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function),
      )
    })
  })

  describe('onDeviceChange', () => {
    it('re-enumerates devices', () => {
      const { wrapper } = mountWith()
      wrapper.vm.enumerate = jest.fn()
      wrapper.vm.onDeviceChange()
      expect(wrapper.vm.enumerate).toHaveBeenCalled()
    })
  })

  describe('permission listener edge cases', () => {
    it('does not store a listener when addEventListener throws', () => {
      const { wrapper } = mountWith()
      const status = {
        state: 'granted',
        addEventListener: () => {
          throw new Error('nope')
        },
        removeEventListener: jest.fn(),
      }
      wrapper.vm.attachPermissionListener('camera', status)
      expect(wrapper.vm.permListeners && wrapper.vm.permListeners.camera).toBeFalsy()
    })

    it('swallows removeEventListener errors on detach', () => {
      const { wrapper } = mountWith()
      wrapper.vm.permListeners = {
        camera: {
          status: {
            removeEventListener: () => {
              throw new Error('boom')
            },
          },
          handler: () => {},
        },
      }
      expect(() => wrapper.vm.detachPermissionListener('camera')).not.toThrow()
      expect(wrapper.vm.permListeners.camera).toBeUndefined()
    })
  })

  describe('acquireStream device constraints', () => {
    it('requests the selected camera and mic by exact deviceId', async () => {
      const stream = { getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] }
      const mediaDevices = {
        getUserMedia: jest.fn().mockResolvedValue(stream),
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
        selectedCamera: 'cam-1',
        selectedMic: 'mic-1',
      })
      await wrapper.vm.acquireStream()
      expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { deviceId: { exact: 'cam-1' } },
        audio: { deviceId: { exact: 'mic-1' } },
      })
    })

    it('rethrows when video-only acquisition fails (no audio fallback)', async () => {
      const err = Object.assign(new Error('fail'), { name: 'NotReadableError' })
      const mediaDevices = {
        getUserMedia: jest.fn().mockRejectedValue(err),
        enumerateDevices: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      const { wrapper } = mountWith(mediaDevices)
      wrapper.setData({ cameraActive: true, micActive: false, cameraStatus: 'granted' })
      await expect(wrapper.vm.acquireStream()).rejects.toBe(err)
    })
  })
})
