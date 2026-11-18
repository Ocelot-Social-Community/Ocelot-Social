import { mount } from '@vue/test-utils'
import CallParticipants from './CallParticipants.vue'

const localVue = global.localVue

const person = (userId, overrides = {}) => ({
  userId,
  name: userId,
  profile: { id: userId, name: userId },
  isMe: false,
  micOn: true,
  cameraOn: false,
  screenSharing: false,
  speaking: false,
  ...overrides,
})

describe('CallParticipants', () => {
  let wrapper

  const Wrapper = (propsData = {}) =>
    mount(CallParticipants, {
      localVue,
      mocks: { $t: (key) => key },
      propsData: {
        people: [person('me', { isMe: true }), person('bob'), person('anna')],
        ...propsData,
      },
    })

  const rows = () =>
    wrapper.findAll('li').wrappers.map((row) => row.attributes('data-test').slice(17))
  const device = (kind, userId) =>
    wrapper.find(`[data-test="call-participant-device-${kind}-${userId}"]`)

  afterEach(() => {
    wrapper.destroy()
  })

  it('has one row for each person, with their name', () => {
    wrapper = Wrapper()
    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(wrapper.find('[data-test="call-participant-bob"]').text()).toContain('bob')
  })

  it('puts whoever speaks first, then oneself, then the rest by name', () => {
    wrapper = Wrapper({
      people: [
        person('zoe'),
        person('anna'),
        person('me', { isMe: true }),
        person('loud', { speaking: true }),
      ],
    })
    expect(rows()).toEqual(['loud', 'me', 'anna', 'zoe'])
  })

  it('sorts somebody without a name among the rest', () => {
    wrapper = Wrapper({ people: [person('b', { name: null }), person('a', { name: 'Anna' })] })
    expect(rows()).toEqual(['b', 'a'])
  })

  it('rings whoever speaks', () => {
    wrapper = Wrapper({ people: [person('loud', { speaking: true }), person('quiet')] })
    expect(wrapper.find('[data-test="call-participant-loud"]').classes()).toContain(
      'call-participants__row--speaking',
    )
    expect(wrapper.find('[data-test="call-participant-quiet"]').classes()).not.toContain(
      'call-participants__row--speaking',
    )
  })

  it('shows microphone and camera, what is off in red, and a screen share first', () => {
    const bob = person('bob', { micOn: false, cameraOn: true, screenSharing: true })
    wrapper = Wrapper({ people: [bob] })
    // The screen's symbol is the app's own (branding), which the tests do not load: its order is
    // read from what the row is built of.
    expect(wrapper.vm.devicesOf(bob).map(({ kind, on }) => [kind, on])).toEqual([
      ['screen', true],
      ['mic', false],
      ['camera', true],
    ])
    expect(device('mic', 'bob').classes()).toContain('call-participants__off')
    expect(device('camera', 'bob').classes()).not.toContain('call-participants__off')
  })

  it('shows no screen share where there is none', () => {
    wrapper = Wrapper()
    expect(wrapper.vm.devicesOf(person('bob')).map(({ kind }) => kind)).toEqual(['mic', 'camera'])
  })

  it('tells a screen reader what each one has on', () => {
    wrapper = Wrapper()
    expect(
      wrapper.vm.stateLabel(person('x', { micOn: false, cameraOn: true, screenSharing: true })),
    ).toBe(
      'videoCall.participants.micOff, videoCall.participants.cameraOn, videoCall.participants.sharing',
    )
    // The ring around whoever speaks, in words.
    expect(wrapper.vm.stateLabel(person('z', { speaking: true }))).toBe(
      'videoCall.participants.speaking, videoCall.participants.micOn, videoCall.participants.cameraOff',
    )
    expect(wrapper.vm.stateLabel(person('y'))).toBe(
      'videoCall.participants.micOn, videoCall.participants.cameraOff',
    )
  })
})
