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
      starting-signs
      :camera-starting="cameraStarting"
      :mic-starting="micStarting"
      @camera-change="emitSwitch('videoinput', cameras, $event)"
      @mic-change="emitSwitch('audioinput', mics, $event)"
      @speaker-change="emitSwitch('audiooutput', speakers, $event)"
    />
    <div class="device-settings__row">
      <label class="device-settings__label" for="video-call-send-quality">
        {{ $t('videoCall.deviceSettings.sendQuality') }}
      </label>
      <select
        id="video-call-send-quality"
        data-test="video-call-send-quality"
        :value="sendQuality"
        :disabled="cameraRenewing"
        @change="$emit('send-quality-change', $event.target.value)"
      >
        <option v-for="q in sendQualities" :key="q" :value="q" :selected="q === sendQuality">
          {{ $t(`videoCall.deviceSettings.quality.${q}`) }}
        </option>
      </select>
    </div>
    <div class="device-settings__row">
      <label class="device-settings__label" for="video-call-receive-quality">
        {{ $t('videoCall.deviceSettings.receiveQuality') }}
      </label>
      <select
        id="video-call-receive-quality"
        data-test="video-call-receive-quality"
        :value="receiveQuality"
        @change="$emit('receive-quality-change', $event.target.value)"
      >
        <option v-for="q in receiveQualities" :key="q" :value="q" :selected="q === receiveQuality">
          {{ $t(`videoCall.deviceSettings.quality.${q}`) }}
        </option>
      </select>
    </div>
    <label class="device-settings__option">
      <input
        type="checkbox"
        data-test="video-call-dtx"
        aria-describedby="video-call-dtx-hint"
        :checked="dtx"
        :disabled="dtxApplying"
        @change="$emit('dtx-change', $event.target.checked)"
      />
      <span class="device-settings__option-text">
        {{ $t('videoCall.deviceSettings.dtx') }}
        <small id="video-call-dtx-hint" class="device-settings__option-hint">
          {{ $t('videoCall.deviceSettings.dtxHint') }}
        </small>
      </span>
    </label>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import DeviceSelectors from './DeviceSelectors.vue'
import { RECEIVE_QUALITIES, SEND_QUALITIES } from './devicePreferences'

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
    cameraStarting: {
      type: Boolean,
      default: false,
    },
    micStarting: {
      type: Boolean,
      default: false,
    },
    // Whether our microphone leaves out pauses in speech (Opus DTX).
    dtx: {
      type: Boolean,
      default: false,
    },
    // The microphone is being published anew to apply a change of `dtx`.
    dtxApplying: {
      type: Boolean,
      default: false,
    },
    // The video quality the user asked for (see devicePreferences).
    sendQuality: {
      type: String,
      default: 'auto',
    },
    receiveQuality: {
      type: String,
      default: 'auto',
    },
    // Our camera is being started anew: a new send quality has to wait for it.
    cameraRenewing: {
      type: Boolean,
      default: false,
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
    this.sendQualities = SEND_QUALITIES
    this.receiveQualities = RECEIVE_QUALITIES
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
  border: 1px solid var(--border-color-softest);
  border-radius: var(--border-radius-base);
  box-shadow: var(--box-shadow-large);
  /*  Scrolls down when the parked window is too low for it, never sideways: */
  /*  Safari counts the cut-off rest of a device name longer than its field */
  /*  ("Desk View Camera of …") as content, and the field itself cannot be */
  /*  told to clip it. */
  overflow-x: hidden;
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

.device-settings__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxx-small);
}

.device-settings__label {
  font-weight: var(--text-weight-bold);
  font-size: var(--font-size-base);
  color: var(--text-color-base);
}

.device-settings__row select {
  background: var(--background-color-base);
  color: var(--text-color-base);
  border: 1px solid var(--color-neutral-70);
  padding: var(--space-xx-small) var(--space-x-small);
  border-radius: var(--border-radius-base);
  width: 100%;
  font-family: var(--font-family-text);
  font-size: var(--font-size-base);
}

.device-settings__option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-x-small);
  cursor: pointer;
}

.device-settings__option input {
  margin-top: 0.2em;
}

.device-settings__option-text {
  display: flex;
  flex-direction: column;
}

.device-settings__option-hint {
  color: var(--text-color-soft);
}

.device-settings__title {
  margin: 0;
  font-size: var(--font-size-large);
  font-family: var(--font-family-heading);
  font-weight: var(--text-weight-bold);
  color: var(--text-color-base);
}
</style>
