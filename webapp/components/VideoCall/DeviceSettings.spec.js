import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import DeviceSettings from './DeviceSettings.vue'

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
  DeviceSelectors: Stub('DeviceSelectors', {
    props: [
      'cameras',
      'mics',
      'speakers',
      'selectedCamera',
      'selectedMic',
      'selectedSpeaker',
      'cameraStarting',
      'micStarting',
    ],
  }),
}

const DEVICES = [
  { kind: 'videoinput', deviceId: 'cam-1', label: 'Built-in camera' },
  { kind: 'videoinput', deviceId: 'cam-2', label: 'Webcam' },
  { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in microphone' },
  { kind: 'audioinput', deviceId: 'mic-2', label: '' },
  { kind: 'audiooutput', deviceId: 'spk-1', label: 'Built-in speaker' },
]

const mountWith = async ({ propsData = {}, mediaDevices } = {}) => {
  const defaultMediaDevices = {
    enumerateDevices: jest.fn().mockResolvedValue(DEVICES),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }
  const devices = mediaDevices === undefined ? defaultMediaDevices : mediaDevices
  Object.defineProperty(global.navigator, 'mediaDevices', { value: devices, configurable: true })
  const wrapper = mount(DeviceSettings, {
    propsData,
    mocks: { $t: (k) => k },
    stubs,
    attachTo: document.body,
  })
  await flushPromises()
  return {
    wrapper,
    mediaDevices: devices,
    selectors: wrapper.findComponent({ name: 'DeviceSelectors' }),
  }
}

describe('DeviceSettings', () => {
  it('takes the focus and lists the devices by kind', async () => {
    const { wrapper, selectors } = await mountWith()
    expect(document.activeElement).toBe(wrapper.element)
    expect(selectors.props('cameras')).toHaveLength(2)
    expect(selectors.props('mics')).toHaveLength(2)
    expect(selectors.props('speakers')).toHaveLength(1)
    wrapper.destroy()
  })

  it('shows the devices of the call as selected', async () => {
    const { wrapper, selectors } = await mountWith({
      propsData: { cameraDeviceId: 'cam-2', micDeviceId: 'mic-2', speakerDeviceId: 'spk-1' },
    })
    expect(selectors.props('selectedCamera')).toBe('cam-2')
    expect(selectors.props('selectedMic')).toBe('mic-2')
    expect(selectors.props('selectedSpeaker')).toBe('spk-1')
    wrapper.destroy()
  })

  it('falls back to the first device when the one of the call is unknown', async () => {
    const { wrapper, selectors } = await mountWith({ propsData: { cameraDeviceId: 'unplugged' } })
    expect(selectors.props('selectedCamera')).toBe('cam-1')
    expect(selectors.props('selectedMic')).toBe('mic-1')
    wrapper.destroy()
  })

  it('asks for a switch with kind, id and label of the chosen device', async () => {
    const { wrapper, selectors } = await mountWith()
    selectors.vm.$emit('camera-change', 'cam-2')
    selectors.vm.$emit('mic-change', 'mic-2')
    selectors.vm.$emit('speaker-change', 'gone')
    expect(wrapper.emitted('switch').map(([payload]) => payload)).toEqual([
      { kind: 'videoinput', deviceId: 'cam-2', label: 'Webcam' },
      { kind: 'audioinput', deviceId: 'mic-2', label: '' },
      { kind: 'audiooutput', deviceId: 'gone', label: '' },
    ])
    wrapper.destroy()
  })

  it('passes on which device is starting', async () => {
    const { wrapper, selectors } = await mountWith({ propsData: { cameraStarting: true } })
    expect(selectors.props('cameraStarting')).toBe(true)
    expect(selectors.props('micStarting')).toBe(false)
    await wrapper.setProps({ cameraStarting: false, micStarting: true })
    expect(selectors.props('cameraStarting')).toBe(false)
    expect(selectors.props('micStarting')).toBe(true)
    wrapper.destroy()
  })

  it('asks to be closed via its close button', async () => {
    const { wrapper } = await mountWith()
    await wrapper.find('[data-test="video-call-device-settings-close"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.destroy()
  })

  it('follows devices that come and go while it is open', async () => {
    const { wrapper, mediaDevices, selectors } = await mountWith()
    expect(mediaDevices.addEventListener).toHaveBeenCalledWith('devicechange', wrapper.vm.enumerate)
    mediaDevices.enumerateDevices.mockResolvedValue([DEVICES[0]])
    await wrapper.vm.enumerate()
    expect(selectors.props('cameras')).toHaveLength(1)
    expect(selectors.props('mics')).toHaveLength(0)
    expect(selectors.props('selectedMic')).toBe('')

    wrapper.destroy()
    expect(mediaDevices.removeEventListener).toHaveBeenCalledWith(
      'devicechange',
      wrapper.vm.enumerate,
    )
  })

  it('keeps the last list when the browser fails to enumerate', async () => {
    const { wrapper, mediaDevices, selectors } = await mountWith()
    mediaDevices.enumerateDevices.mockRejectedValue(new Error('boom'))
    await expect(wrapper.vm.enumerate()).resolves.toBeUndefined()
    expect(selectors.props('cameras')).toHaveLength(2)
    wrapper.destroy()
  })

  it('renders without devices in a browser lacking mediaDevices', async () => {
    const { wrapper, selectors } = await mountWith({ mediaDevices: null })
    expect(selectors.props('cameras')).toEqual([])
    expect(() => wrapper.destroy()).not.toThrow()
  })
})
