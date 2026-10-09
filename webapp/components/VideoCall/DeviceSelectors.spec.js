import { mount } from '@vue/test-utils'
import DeviceSelectors from './DeviceSelectors.vue'

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
}

const mountWith = (propsData = {}) => ({
  wrapper: mount(DeviceSelectors, {
    propsData: { idPrefix: 'test', ...propsData },
    mocks: { $t: (k) => k },
    stubs,
  }),
})

describe('DeviceSelectors', () => {
  describe('device rows', () => {
    const devices = {
      cameras: [
        { deviceId: 'cam-1', label: 'Built-in camera' },
        { deviceId: 'cam-2', label: '' },
      ],
      mics: [{ deviceId: 'mic-1', label: 'Built-in microphone' }],
      speakers: [{ deviceId: 'spk-1', label: '' }],
    }

    it('lists the devices under ids carrying the prefix, unnamed ones by a fallback', () => {
      const { wrapper } = mountWith({ ...devices, selectedCamera: 'cam-2' })
      const options = wrapper.findAll('#test-camera option')
      expect(options).toHaveLength(2)
      expect(options.at(0).text()).toBe('Built-in camera')
      expect(options.at(1).text()).toBe('videoCall.prejoin.unnamedCamera')
      expect(wrapper.find('#test-camera').element.value).toBe('cam-2')
      expect(wrapper.find('#test-mic option').text()).toBe('Built-in microphone')
      expect(wrapper.find('#test-speaker option').text()).toBe('videoCall.prejoin.unnamedSpeaker')
    })

    it('shows the selected device when the list and the selection arrive together', async () => {
      // The way both dialogs get them: mounted empty, then the browser's list
      // and the device in use at once. The selection must not fall back to
      // the first entry of the list.
      const { wrapper } = mountWith()
      await wrapper.setProps({
        cameras: devices.cameras,
        selectedCamera: 'cam-2',
        mics: [...devices.mics, { deviceId: 'mic-2', label: 'Headset' }],
        selectedMic: 'mic-2',
        speakers: [...devices.speakers, { deviceId: 'spk-2', label: 'Headset' }],
        selectedSpeaker: 'spk-2',
      })
      expect(wrapper.find('#test-camera').element.value).toBe('cam-2')
      expect(wrapper.find('#test-mic').element.value).toBe('mic-2')
      expect(wrapper.find('#test-speaker').element.value).toBe('spk-2')
    })

    it('disables a selection without devices', () => {
      const { wrapper } = mountWith()
      for (const id of ['#test-camera', '#test-mic', '#test-speaker']) {
        expect(wrapper.find(id).attributes('disabled')).toBe('disabled')
        expect(wrapper.find(`${id} option`).text()).toBe('videoCall.prejoin.noDevices')
      }
    })

    it('reports the device the user picked', async () => {
      // jsdom has no setSinkId, which would leave the speaker row disabled.
      const originalSetSinkId = HTMLMediaElement.prototype.setSinkId
      HTMLMediaElement.prototype.setSinkId = () => Promise.resolve()
      try {
        const { wrapper } = mountWith({
          cameras: [...devices.cameras],
          mics: [...devices.mics, { deviceId: 'mic-2', label: 'Headset' }],
          speakers: [...devices.speakers, { deviceId: 'spk-2', label: 'Headset' }],
        })
        await wrapper.find('#test-camera').setValue('cam-2')
        await wrapper.find('#test-mic').setValue('mic-2')
        await wrapper.find('#test-speaker').setValue('spk-2')
        expect(wrapper.emitted('camera-change')).toEqual([['cam-2']])
        expect(wrapper.emitted('mic-change')).toEqual([['mic-2']])
        expect(wrapper.emitted('speaker-change')).toEqual([['spk-2']])
      } finally {
        if (originalSetSinkId === undefined) delete HTMLMediaElement.prototype.setSinkId
        else HTMLMediaElement.prototype.setSinkId = originalSetSinkId
      }
    })

    it('shows permission badges only when a status is given', () => {
      expect(mountWith().wrapper.find('.device-selectors__status--granted').exists()).toBe(false)
      const { wrapper } = mountWith({ cameraStatus: 'granted', micStatus: 'denied' })
      expect(wrapper.find('.device-selectors__status--granted').text()).toBe(
        'videoCall.prejoin.permission.granted',
      )
      expect(wrapper.find('.device-selectors__status--denied').exists()).toBe(true)
    })
  })

  describe('a device that is starting', () => {
    const CAMERA = '[data-test="device-camera-starting"]'
    const MIC = '[data-test="device-mic-starting"]'
    const SLOT = '.device-selectors__slot'

    it('keeps no line free and says nothing unless asked to', () => {
      const { wrapper } = mountWith({ cameraStarting: true, micStarting: true })
      expect(wrapper.find(SLOT).exists()).toBe(false)
      expect(wrapper.find(CAMERA).exists()).toBe(false)
      expect(wrapper.find(MIC).exists()).toBe(false)
    })

    it('keeps a line free below the camera and the microphone field from the start', () => {
      const { wrapper } = mountWith({ startingSigns: true })
      const slots = wrapper.findAll(SLOT)
      expect(slots).toHaveLength(2)
      expect(slots.at(0).element.previousElementSibling.id).toBe('test-camera')
      expect(slots.at(1).element.previousElementSibling.id).toBe('test-mic')
      expect(wrapper.find(CAMERA).exists()).toBe(false)
      expect(wrapper.find(MIC).exists()).toBe(false)
    })

    it('says in the line of the camera that it is starting', async () => {
      const { wrapper } = mountWith({ startingSigns: true, cameraStarting: true })
      expect(wrapper.findAll(SLOT).at(0).find(CAMERA).text()).toBe(
        'videoCall.prejoin.cameraStarting',
      )
      expect(wrapper.find(MIC).exists()).toBe(false)

      await wrapper.setProps({ cameraStarting: false })
      expect(wrapper.find(CAMERA).exists()).toBe(false)
      expect(wrapper.findAll(SLOT)).toHaveLength(2)
    })

    it('says so in place of the level bar of the microphone, which returns afterwards', async () => {
      const { wrapper } = mountWith({
        startingSigns: true,
        micStarting: true,
        meterStream: { getAudioTracks: () => [] },
      })
      const slot = wrapper.findAll(SLOT).at(1)
      expect(slot.find(MIC).text()).toBe('videoCall.prejoin.micStarting')
      expect(wrapper.find('.device-selectors__meter').exists()).toBe(false)

      await wrapper.setProps({ micStarting: false })
      expect(wrapper.find(MIC).exists()).toBe(false)
      expect(slot.find('.device-selectors__meter').exists()).toBe(true)

      wrapper.vm.setMicLevel(30)
      expect(slot.find('.device-selectors__meter-fill').element.style.width).toBe('30%')
    })

    it('keeps the line of the microphone free while it is muted', () => {
      const { wrapper } = mountWith({ startingSigns: true })
      const slot = wrapper.findAll(SLOT).at(1)
      expect(slot.find(MIC).exists()).toBe(false)
      expect(slot.find('.device-selectors__meter').exists()).toBe(false)
    })
  })

  describe('meterStream', () => {
    it('shows and runs the meter only while there is a stream', async () => {
      const { wrapper } = mountWith()
      const startMeter = jest.spyOn(wrapper.vm, 'startMeter').mockImplementation(() => {})
      const stopMeter = jest.spyOn(wrapper.vm, 'stopMeter')
      expect(wrapper.find('.device-selectors__meter').exists()).toBe(false)

      const stream = { getAudioTracks: () => [] }
      await wrapper.setProps({ meterStream: stream })
      expect(startMeter).toHaveBeenCalledWith(stream)
      expect(wrapper.find('.device-selectors__meter').exists()).toBe(true)

      await wrapper.setProps({ meterStream: null })
      expect(stopMeter).toHaveBeenCalled()
      expect(wrapper.find('.device-selectors__meter').exists()).toBe(false)
    })

    it('moves the level bar without rendering the selections anew', async () => {
      const { wrapper } = mountWith({
        meterStream: { getAudioTracks: () => [] },
        cameras: [{ deviceId: 'cam-1', label: 'Built-in camera' }],
        selectedCamera: 'cam-1',
      })
      await wrapper.vm.$nextTick()
      const rendered = jest.fn()
      wrapper.vm.$on('hook:updated', rendered)

      wrapper.vm.setMicLevel(42)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.device-selectors__meter-fill').element.style.width).toBe('42%')
      expect(wrapper.vm.micLevelPercent).toBe(42)
      expect(rendered).not.toHaveBeenCalled()
    })

    it('keeps the level to itself while there is no bar to show it on', () => {
      const { wrapper } = mountWith()
      expect(() => wrapper.vm.setMicLevel(10)).not.toThrow()
      expect(wrapper.vm.micLevelPercent).toBe(10)
    })

    it('stops the meter on destroy', () => {
      const { wrapper } = mountWith()
      const close = jest.fn()
      wrapper.vm.audioCtx = { close }
      wrapper.destroy()
      expect(close).toHaveBeenCalled()
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

    const buildToneCtx = (state = 'running') => {
      const node = { connect: jest.fn(() => node) }
      return {
        state,
        currentTime: 0,
        resume: jest.fn().mockResolvedValue(),
        createOscillator: jest.fn(() => ({
          type: '',
          frequency: { setValueAtTime: jest.fn() },
          connect: jest.fn(() => node),
          start: jest.fn(),
          stop: jest.fn(),
          onended: null,
        })),
        createGain: jest.fn(() => ({
          gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
          connect: jest.fn(() => node),
        })),
        createMediaStreamDestination: jest.fn(() => ({ stream: {} })),
        destination: {},
        close: jest.fn().mockResolvedValue(),
      }
    }

    it('routes the tone to the selected speaker and cleans up when it ends', async () => {
      const originalSetSinkId = HTMLMediaElement.prototype.setSinkId
      HTMLMediaElement.prototype.setSinkId = function () {
        return Promise.resolve()
      }
      const originalAC = window.AudioContext
      const ctx = buildToneCtx('suspended')
      let createdOsc
      ctx.createOscillator.mockImplementation(() => {
        createdOsc = {
          type: '',
          frequency: { setValueAtTime: jest.fn() },
          connect: jest.fn(() => ({ connect: jest.fn() })),
          start: jest.fn(),
          stop: jest.fn(),
          onended: null,
        }
        return createdOsc
      })
      window.AudioContext = jest.fn(() => ctx)
      try {
        const { wrapper } = mountWith()
        const audio = {
          setSinkId: jest.fn().mockResolvedValue(),
          play: jest.fn().mockResolvedValue(),
          pause: jest.fn(),
          srcObject: null,
        }
        wrapper.vm.$refs.speakerTestEl = audio
        wrapper.setProps({ selectedSpeaker: 'spk-1' })
        await wrapper.vm.playTestTone()
        expect(ctx.resume).toHaveBeenCalled()
        expect(ctx.createMediaStreamDestination).toHaveBeenCalled()
        expect(audio.setSinkId).toHaveBeenCalledWith('spk-1')
        expect(audio.play).toHaveBeenCalled()
        // Drive the oscillator's end callback to cover the cleanup path.
        createdOsc.onended()
        expect(audio.pause).toHaveBeenCalled()
        expect(ctx.close).toHaveBeenCalled()
        expect(wrapper.vm.testingTone).toBe(false)
      } finally {
        window.AudioContext = originalAC
        if (originalSetSinkId === undefined) {
          delete HTMLMediaElement.prototype.setSinkId
        } else {
          HTMLMediaElement.prototype.setSinkId = originalSetSinkId
        }
      }
    })

    it('falls back to the default output when no speaker is selected', async () => {
      const originalAC = window.AudioContext
      const ctx = buildToneCtx('running')
      window.AudioContext = jest.fn(() => ctx)
      try {
        const { wrapper } = mountWith()
        await wrapper.vm.playTestTone()
        expect(ctx.createMediaStreamDestination).not.toHaveBeenCalled()
      } finally {
        window.AudioContext = originalAC
      }
    })

    it('closes the context and resets when setup throws (even if close also throws)', async () => {
      const originalAC = window.AudioContext
      const ctx = buildToneCtx('running')
      ctx.createOscillator = jest.fn(() => {
        throw new Error('boom')
      })
      ctx.close = jest.fn(() => {
        throw new Error('close')
      })
      window.AudioContext = jest.fn(() => ctx)
      try {
        const { wrapper } = mountWith()
        await wrapper.vm.playTestTone()
        expect(ctx.close).toHaveBeenCalled()
        expect(wrapper.vm.testingTone).toBe(false)
      } finally {
        window.AudioContext = originalAC
      }
    })

    it('tolerates failures from every media call during playback', async () => {
      const originalSetSinkId = HTMLMediaElement.prototype.setSinkId
      HTMLMediaElement.prototype.setSinkId = function () {
        return Promise.resolve()
      }
      const originalAC = window.AudioContext
      const ctx = buildToneCtx('suspended')
      ctx.resume = jest.fn().mockRejectedValue(new Error('resume'))
      ctx.close = jest.fn(() => {
        throw new Error('close')
      })
      let createdOsc
      ctx.createOscillator.mockImplementation(() => {
        createdOsc = {
          type: '',
          frequency: { setValueAtTime: jest.fn() },
          connect: jest.fn(() => ({ connect: jest.fn() })),
          start: jest.fn(),
          stop: jest.fn(),
          onended: null,
        }
        return createdOsc
      })
      window.AudioContext = jest.fn(() => ctx)
      try {
        const { wrapper } = mountWith()
        const audio = {
          setSinkId: jest.fn().mockRejectedValue(new Error('sink')),
          play: jest.fn().mockRejectedValue(new Error('play')),
          pause: jest.fn(() => {
            throw new Error('pause')
          }),
          srcObject: null,
        }
        wrapper.vm.$refs.speakerTestEl = audio
        wrapper.setProps({ selectedSpeaker: 'spk-1' })
        await wrapper.vm.playTestTone()
        expect(ctx.resume).toHaveBeenCalled()
        createdOsc.onended()
        expect(wrapper.vm.testingTone).toBe(false)
      } finally {
        window.AudioContext = originalAC
        if (originalSetSinkId === undefined) {
          delete HTMLMediaElement.prototype.setSinkId
        } else {
          HTMLMediaElement.prototype.setSinkId = originalSetSinkId
        }
      }
    })
  })

  describe('startMeter (full meter loop)', () => {
    it('drives the level meter from audio samples', () => {
      const { wrapper } = mountWith()
      const analyser = {
        fftSize: 0,
        frequencyBinCount: 8,
        connect: jest.fn(),
        getByteTimeDomainData: (buf) => {
          for (let i = 0; i < buf.length; i++) buf[i] = 200
        },
      }
      const ctx = {
        createMediaStreamSource: jest.fn(() => ({ connect: jest.fn() })),
        createAnalyser: jest.fn(() => analyser),
        close: jest.fn(),
      }
      const originalAC = window.AudioContext
      const originalRAF = global.requestAnimationFrame
      window.AudioContext = jest.fn(() => ctx)
      global.requestAnimationFrame = jest.fn(() => 99)
      try {
        wrapper.vm.startMeter({ getAudioTracks: () => [{}] })
        expect(wrapper.vm.micLevelPercent).toBeGreaterThan(0)
        expect(wrapper.vm.meterRaf).toBe(99)
      } finally {
        window.AudioContext = originalAC
        global.requestAnimationFrame = originalRAF
        wrapper.vm.stopMeter()
      }
    })
  })
})
