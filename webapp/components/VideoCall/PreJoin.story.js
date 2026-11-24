import { storiesOf } from '@storybook/vue'
import PreJoin from '~/components/VideoCall/PreJoin.vue'
import RoomHeader from '~/components/_new/generic/RoomHeader/RoomHeader.vue'
import helpers from '~/storybook/helpers'

helpers.init()

const device = (kind, deviceId, label) => ({ kind, deviceId, label, groupId: deviceId })

// Two of each, all granted — the longest the dialog gets: every device row, the speaker one
// included (Chromium has setSinkId). The stream carries no tracks, so the preview shows the
// placeholder rather than a picture that would differ from run to run.
const fakeMediaDevices = {
  getUserMedia: async () => new MediaStream(),
  enumerateDevices: async () => [
    device('videoinput', 'cam-1', 'Integrated Camera'),
    device('videoinput', 'cam-2', 'USB Camera'),
    device('audioinput', 'mic-1', 'Integrated Microphone'),
    device('audioinput', 'mic-2', 'Headset Microphone'),
    device('audiooutput', 'spk-1', 'Speakers'),
    device('audiooutput', 'spk-2', 'Headphones'),
  ],
  addEventListener() {},
  removeEventListener() {},
}
const fakePermissions = {
  query: async () => ({ state: 'granted', addEventListener() {}, removeEventListener() {} }),
}

storiesOf('PreJoin', module)
  .addDecorator(helpers.layout)
  // The pre-join dialog as a phone shows it: VideoCall makes it fill the screen below 810px
  // (video-call--modal), its header above the device setup, and the dialog scrolls inside. The
  // join button has to be in view without scrolling, at every phone size (#11079) — see
  // PreJoin.visual.spec.js. The header is the call's own (compact RoomHeader), so the setup gets
  // no more height here than in the call.
  .add('full screen', () => ({
    components: { PreJoin, RoomHeader },
    store: helpers.store,
    beforeCreate() {
      // Before PreJoin mounts and asks for the devices.
      Object.defineProperty(navigator, 'mediaDevices', {
        value: fakeMediaDevices,
        configurable: true,
      })
      Object.defineProperty(navigator, 'permissions', {
        value: fakePermissions,
        configurable: true,
      })
    },
    template: `
      <div style="position: fixed; inset: 0; display: flex; flex-direction: column">
        <room-header
          compact
          show-group-icon
          :profile="{ id: 'g1', name: 'Yoga Practice' }"
          title="Yoga Practice"
        />
        <pre-join />
      </div>`,
  }))
