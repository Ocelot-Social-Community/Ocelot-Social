<template>
  <div
    class="device-settings"
    role="dialog"
    tabindex="-1"
    data-test="video-call-device-settings"
    :aria-label="$t('videoCall.deviceSettings.title')"
  >
    <div class="device-settings__header">
      <h2 class="device-settings__title">
        {{ $t('videoCall.deviceSettings.title') }}
      </h2>
      <os-button
        data-test="video-call-device-settings-close"
        variant="primary"
        appearance="outline"
        size="sm"
        circle
        :aria-label="$t('actions.close')"
        @click="$emit('close')"
      >
        <template #icon>
          <os-icon :icon="icons.close" />
        </template>
      </os-button>
    </div>
    <device-selectors
      id-prefix="video-call"
      :cameras="cameras"
      :mics="mics"
      :speakers="speakers"
      :selected-camera="selectedCamera"
      :selected-mic="selectedMic"
      :selected-speaker="selectedSpeaker"
      :meter-stream="meterStream"
      @camera-change="emitSwitch('videoinput', cameras, $event)"
      @mic-change="emitSwitch('audioinput', mics, $event)"
      @speaker-change="emitSwitch('audiooutput', speakers, $event)"
    />
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import DeviceSelectors from './DeviceSelectors.vue'

// Device selection during a running call. It only lists the devices and says
// which one the user asked for — switching is up to the call, which owns the
// room.
export default {
  name: 'DeviceSettings',
  components: { OsButton, OsIcon, DeviceSelectors },
  props: {
    cameraDeviceId: {
      type: String,
      default: null,
    },
    micDeviceId: {
      type: String,
      default: null,
    },
    speakerDeviceId: {
      type: String,
      default: null,
    },
    meterStream: {
      type: null,
      default: null,
    },
  },
  data() {
    return {
      cameras: [],
      mics: [],
      speakers: [],
    }
  },
  computed: {
    selectedCamera() {
      return this.shownDevice(this.cameras, this.cameraDeviceId)
    },
    selectedMic() {
      return this.shownDevice(this.mics, this.micDeviceId)
    },
    selectedSpeaker() {
      return this.shownDevice(this.speakers, this.speakerDeviceId)
    },
  },
  created() {
    this.icons = iconRegistry
  },
  async mounted() {
    this.$el.focus()
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return
    navigator.mediaDevices.addEventListener('devicechange', this.enumerate)
    await this.enumerate()
  },
  beforeDestroy() {
    if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.enumerate)
    }
  },
  methods: {
    async enumerate() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        this.cameras = devices.filter((d) => d.kind === 'videoinput')
        this.mics = devices.filter((d) => d.kind === 'audioinput')
        this.speakers = devices.filter((d) => d.kind === 'audiooutput')
      } catch (_e) {
        /* noop */
      }
    },
    shownDevice(devices, deviceId) {
      // Without a known device (joined with it switched off, or it has been
      // unplugged since) the browser falls back to its default, which it
      // lists first.
      return devices.some((d) => d.deviceId === deviceId) ? deviceId : devices[0]?.deviceId || ''
    },
    emitSwitch(kind, devices, deviceId) {
      const device = devices.find((d) => d.deviceId === deviceId)
      this.$emit('switch', { kind, deviceId, label: (device && device.label) || '' })
    },
  },
}
</script>

<style scoped>
.device-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
  padding: var(--space-small);
  background: var(--background-color-soft);
  color: var(--text-color-base);
  border: 1px solid var(--color-neutral-85);
  border-radius: var(--border-radius-base);
  box-shadow: var(--box-shadow-large);
  overflow-y: auto;
  /*  The panel takes the focus when it opens so Escape and Tab start from it; */
  /*  a focus ring around the whole panel would only be noise. */
  outline: none;
}

.device-settings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-x-small);
}

.device-settings__title {
  margin: 0;
  font-size: var(--font-size-large);
  font-family: var(--font-family-heading);
  font-weight: var(--text-weight-bold);
  color: var(--text-color-base);
}
</style>
