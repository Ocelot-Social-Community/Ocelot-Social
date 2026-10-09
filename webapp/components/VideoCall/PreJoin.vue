<template>
  <div class="prejoin">
    <div class="prejoin__preview">
      <video v-show="hasVideo" ref="previewEl" autoplay muted playsinline class="prejoin__video" />
      <div v-if="!hasVideo" class="prejoin__placeholder" :role="cameraStarting ? 'status' : null">
        <os-spinner v-if="cameraStarting" size="2xl" data-test="prejoin-camera-starting" />
        <avatar-image v-else :profile="currentUser" size="large" class="prejoin__avatar" />
        <span class="prejoin__placeholder-text">
          {{ placeholderText }}
        </span>
        <span
          v-if="startingCameraName"
          class="prejoin__starting-device"
          data-test="prejoin-camera-starting-name"
        >
          {{ startingCameraName }}
        </span>
      </div>
      <div
        v-if="micStarting"
        class="prejoin__mic-starting"
        role="status"
        data-test="prejoin-mic-starting"
      >
        <os-spinner size="sm" />
        <span class="prejoin__mic-starting-text">
          {{ $t('videoCall.prejoin.micStarting') }}
          <span v-if="startingMicName" class="prejoin__starting-device">
            {{ startingMicName }}
          </span>
        </span>
      </div>
    </div>

    <div class="prejoin__panel">
      <h2 class="prejoin__title">
        {{ $t('videoCall.prejoin.title') }}
      </h2>
      <p class="prejoin__description">
        {{ $t('videoCall.prejoin.description') }}
      </p>

      <device-selectors
        id-prefix="prejoin"
        :cameras="cameras"
        :mics="mics"
        :speakers="speakers"
        :selected-camera="selectedCamera"
        :selected-mic="selectedMic"
        :selected-speaker="selectedSpeaker"
        :camera-status="cameraStatus"
        :mic-status="micStatus"
        :meter-stream="meterStream"
        @camera-change="onCameraChange"
        @mic-change="onMicChange"
        @speaker-change="onSpeakerChange"
      />

      <div v-if="permissionError" class="prejoin__error" role="alert">
        <span class="prejoin__error-text">{{ permissionError }}</span>
        <os-button appearance="outline" variant="danger" size="sm" @click="retry">
          <template #icon><os-icon :icon="icons.refresh" /></template>
          {{ $t('videoCall.prejoin.retry') }}
        </os-button>
      </div>

      <div class="prejoin__device-toggles">
        <os-button
          data-test="prejoin-mic-toggle"
          :variant="micActive ? 'primary' : 'default'"
          appearance="outline"
          :disabled="micStatus === 'denied' || micStatus === 'unsupported'"
          :aria-pressed="micActive.toString()"
          @click="toggleMicActive"
        >
          <template #icon>
            <os-icon :icon="micActive ? icons.microphone : icons.microphoneSlash" />
          </template>
          {{ micActive ? $t('videoCall.prejoin.micOn') : $t('videoCall.prejoin.micOff') }}
        </os-button>
        <os-button
          data-test="prejoin-camera-toggle"
          :variant="cameraActive ? 'primary' : 'default'"
          appearance="outline"
          :disabled="cameraStatus === 'denied' || cameraStatus === 'unsupported'"
          :aria-pressed="cameraActive.toString()"
          @click="toggleCameraActive"
        >
          <template #icon><os-icon :icon="icons.videoCamera" /></template>
          {{ cameraActive ? $t('videoCall.prejoin.cameraOn') : $t('videoCall.prejoin.cameraOff') }}
        </os-button>
      </div>

      <p class="prejoin__hint">
        {{ joinHint }}
      </p>

      <div class="prejoin__actions">
        <os-button
          data-test="prejoin-cancel"
          variant="primary"
          appearance="outline"
          @click="$emit('cancel')"
        >
          <template #icon><os-icon :icon="icons.close" /></template>
          {{ $t('videoCall.prejoin.cancel') }}
        </os-button>
        <os-button data-test="prejoin-join" variant="primary" @click="emitJoin">
          <template #icon><os-icon :icon="icons.phone" /></template>
          {{ $t('videoCall.prejoin.join') }}
        </os-button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { OsButton, OsIcon, OsSpinner } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'
import DeviceSelectors from './DeviceSelectors.vue'
import {
  findPreferredDevice,
  loadDevicePreferences,
  saveDevicePreference,
} from './devicePreferences'

export default {
  name: 'PreJoin',
  components: { OsButton, OsIcon, OsSpinner, AvatarImage, DeviceSelectors },
  data() {
    return {
      cameras: [],
      mics: [],
      speakers: [],
      selectedCamera: '',
      selectedMic: '',
      selectedSpeaker: '',
      cameraStatus: 'prompt', // granted | prompt | denied | unsupported
      micStatus: 'prompt',
      // User intent — independent from permission. Initially mirrors permission,
      // but the user can opt out before joining (silent observer is valid).
      cameraActive: true,
      micActive: true,
      // A camera needs up to several seconds to start. Without a sign of that,
      // the empty preview reads as a failed attempt.
      cameraStarting: false,
      micStarting: false,
      permissionError: null,
      stream: null,
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    hasVideo() {
      return !!(this.stream && this.stream.getVideoTracks().length > 0)
    },
    speakerSupported() {
      return (
        typeof window !== 'undefined' &&
        typeof HTMLMediaElement !== 'undefined' &&
        typeof HTMLMediaElement.prototype.setSinkId === 'function'
      )
    },
    placeholderText() {
      if (this.cameraStarting) return this.$t('videoCall.prejoin.cameraStarting')
      return this.cameraActive
        ? this.$t('videoCall.prejoin.noCamera')
        : this.$t('videoCall.prejoin.cameraDisabled')
    },
    // Which device is on its way. Unknown on the very first start: the
    // browser only names the devices once one was granted.
    startingCameraName() {
      return this.cameraStarting ? this.deviceLabel(this.cameras, this.selectedCamera) : ''
    },
    startingMicName() {
      return this.micStarting ? this.deviceLabel(this.mics, this.selectedMic) : ''
    },
    meterStream() {
      return this.micActive ? this.stream : null
    },
    joinHint() {
      if (!this.micActive && !this.cameraActive) {
        return this.$t('videoCall.prejoin.hintBoth')
      }
      if (!this.micActive) return this.$t('videoCall.prejoin.hintMic')
      if (!this.cameraActive) return this.$t('videoCall.prejoin.hintCamera')
      return ''
    },
  },
  created() {
    this.icons = iconRegistry
    // Non-reactive scratch state. Vue 2 reserves `_`/`$` prefixed properties
    // and doesn't proxy them onto the instance, so initialize them here under
    // plain names to follow the project's convention (see `this.icons`).
    this.permListeners = null
    this.streamRequests = { video: 0, audio: 0 }
    this.starting = { video: 0, audio: 0 }
    this.remembered = {}
  },
  async mounted() {
    await this.initDevices()
  },
  beforeDestroy() {
    // A capture still starting must not switch the camera on after we left.
    this.streamRequests.video++
    this.streamRequests.audio++
    this.stopStream()
    this.detachPermissionListeners()
    if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.onDeviceChange)
    }
  },
  methods: {
    async initDevices() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.cameraStatus = 'unsupported'
        this.micStatus = 'unsupported'
        this.cameraActive = false
        this.micActive = false
        this.permissionError = this.$t('videoCall.prejoin.unsupportedBrowser')
        return
      }
      await this.refreshPermissionStatus()
      // Default intent: opt in if permission is granted or still pending, opt
      // out if permission is denied (toggle is disabled in that case too).
      this.cameraActive = this.cameraStatus !== 'denied'
      this.micActive = this.micStatus !== 'denied'
      this.remembered = loadDevicePreferences()
      try {
        await this.acquireStream()
      } catch (err) {
        this.permissionError = this.permissionMessage(err)
      }
      await this.refreshPermissionStatus()
      if (this.cameraStatus === 'denied') this.cameraActive = false
      if (this.micStatus === 'denied') this.micActive = false
      await this.enumerate()
      this.selectRunningDevices()
      // The preview above already asked for the devices remembered from an
      // earlier call, so it usually runs on them. Where the browser did not
      // know them by their id any more (Safari), the list tells which they
      // are — only then, and only for that kind, the capture starts anew.
      const remembered = this.applyRememberedDevices()
      const elsewhere = ['video', 'audio'].filter(
        (kind) => remembered[kind] && this.previewsOtherDevice(kind),
      )
      if (elsewhere.length) {
        try {
          await this.acquireStream(elsewhere.length === 1 ? elsewhere[0] : undefined)
        } catch (err) {
          this.permissionError = this.permissionMessage(err)
        }
      }
      navigator.mediaDevices.addEventListener('devicechange', this.onDeviceChange)
    },
    setDevices(devices) {
      this.cameras = devices.filter((d) => d.kind === 'videoinput')
      this.mics = devices.filter((d) => d.kind === 'audioinput')
      this.speakers = devices.filter((d) => d.kind === 'audiooutput')
    },
    // What the capture really runs on beats any guess at it — the first entry
    // of the list is not necessarily the browser's default.
    selectRunningDevices() {
      const running = (kind) => {
        const track = this.stream && this.stream.getTracks().find((t) => t.kind === kind)
        return (track && track.getSettings && track.getSettings().deviceId) || ''
      }
      const select = (devices, trackKind, field) => {
        const deviceId = running(trackKind)
        if (!devices.some((d) => d.deviceId === deviceId)) return
        this[field] = deviceId
      }
      select(this.cameras, 'video', 'selectedCamera')
      select(this.mics, 'audio', 'selectedMic')
    },
    applyRememberedDevices() {
      const apply = (devices, kind, field) => {
        const device = findPreferredDevice(devices, this.remembered[kind])
        if (!device || device.deviceId === this[field]) return false
        this[field] = device.deviceId
        return true
      }
      const video = apply(this.cameras, 'videoinput', 'selectedCamera')
      const audio = apply(this.mics, 'audioinput', 'selectedMic')
      apply(this.speakers, 'audiooutput', 'selectedSpeaker')
      return { video, audio }
    },
    previewsOtherDevice(kind) {
      const track = this.stream && this.stream.getTracks().find((t) => t.kind === kind)
      const actual = track && track.getSettings && track.getSettings().deviceId
      const selected = kind === 'video' ? this.selectedCamera : this.selectedMic
      return !!actual && actual !== selected
    },
    deviceConstraint(kind, selected) {
      if (selected) return { deviceId: { exact: selected } }
      // Nothing is selected before the first capture: browsers only list the
      // devices once one was granted. The remembered device goes along as a
      // wish, so the capture starts on it where the browser still knows it,
      // and on the default where not.
      const remembered = this.remembered[kind]
      return remembered ? { deviceId: { ideal: remembered.deviceId } } : true
    },
    rememberDevice(kind, devices, deviceId) {
      saveDevicePreference(
        kind,
        devices.find((d) => d.deviceId === deviceId),
      )
    },
    onDeviceChange() {
      this.enumerate()
    },
    async refreshPermissionStatus() {
      const probe = async (name) => {
        if (!navigator.permissions || !navigator.permissions.query) {
          return { state: 'prompt', status: null }
        }
        try {
          const res = await navigator.permissions.query({ name })
          return { state: res.state, status: res }
        } catch {
          return { state: 'prompt', status: null }
        }
      }
      const cam = await probe('camera')
      const mic = await probe('microphone')
      this.cameraStatus = cam.state
      this.micStatus = mic.state
      this.attachPermissionListener('camera', cam.status)
      this.attachPermissionListener('microphone', mic.status)
    },
    attachPermissionListener(kind, status) {
      if (!status) return
      if (!this.permListeners) this.permListeners = {}
      // Already listening on this PermissionStatus — nothing to do.
      if (this.permListeners[kind] && this.permListeners[kind].status === status) return
      // Detach previous listener (PermissionStatus instance may change on query).
      this.detachPermissionListener(kind)
      const handler = () => this.onPermissionChange(kind, status.state)
      try {
        status.addEventListener('change', handler)
      } catch (_e) {
        return
      }
      this.permListeners[kind] = { status, handler }
    },
    detachPermissionListener(kind) {
      const entry = this.permListeners && this.permListeners[kind]
      if (!entry) return
      try {
        entry.status.removeEventListener('change', entry.handler)
      } catch (_e) {
        /* noop */
      }
      delete this.permListeners[kind]
    },
    detachPermissionListeners() {
      if (!this.permListeners) return
      for (const kind of Object.keys(this.permListeners)) {
        this.detachPermissionListener(kind)
      }
      this.permListeners = null
    },
    async onPermissionChange(kind, newState) {
      if (kind === 'camera') this.cameraStatus = newState
      if (kind === 'microphone') this.micStatus = newState
      const trackKind = kind === 'camera' ? 'video' : 'audio'
      if (newState === 'granted') {
        // A browser that grants per capture (Firefox) also reports the grant
        // our own request has just obtained. That capture is running, or about
        // to: starting it once more would cut it off again — and a camera that
        // is slow to start then needs several attempts to show up at all.
        if (this.captures(trackKind)) return
        // Otherwise the user granted the permission in the browser UI (lock
        // icon / settings) — acquire what was missing and clear the error in
        // place.
        if (kind === 'camera') this.cameraActive = true
        if (kind === 'microphone') this.micActive = true
        this.permissionError = null
        try {
          await this.acquireStream(trackKind)
        } catch (err) {
          this.permissionError = this.permissionMessage(err)
        }
        await this.enumerate()
      } else if (newState === 'denied') {
        if (kind === 'camera') this.cameraActive = false
        if (kind === 'microphone') this.micActive = false
        try {
          await this.acquireStream(trackKind)
        } catch (_e) {
          /* noop */
        }
      }
    },
    captures(kind) {
      return (
        this.starting[kind] > 0 ||
        !!(this.stream && this.stream.getTracks().some((t) => t.kind === kind))
      )
    },
    async retry() {
      this.permissionError = null
      try {
        await this.acquireStream()
        await this.refreshPermissionStatus()
        if (this.cameraStatus === 'denied') this.cameraActive = false
        if (this.micStatus === 'denied') this.micActive = false
        await this.enumerate()
      } catch (err) {
        this.permissionError = this.permissionMessage(err)
      }
    },
    permissionMessage(err) {
      const name = err && err.name
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        return this.$t('videoCall.prejoin.errorDenied')
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        return this.$t('videoCall.prejoin.errorNoDevice')
      }
      if (name === 'NotReadableError') {
        return this.$t('videoCall.prejoin.errorBusy')
      }
      return (err && err.message) || this.$t('videoCall.prejoin.errorUnknown')
    },
    async enumerate() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        this.setDevices(devices)
        // Drop selections that point at devices that have been unplugged —
        // otherwise getUserMedia({ deviceId: { exact: staleId } }) raises
        // OverconstrainedError on the next acquireStream().
        const pick = (list, current) =>
          list.some((d) => d.deviceId === current) ? current : list[0]?.deviceId || ''
        this.selectedCamera = pick(this.cameras, this.selectedCamera)
        this.selectedMic = pick(this.mics, this.selectedMic)
        this.selectedSpeaker = pick(this.speakers, this.selectedSpeaker)
      } catch (_e) {
        /* noop */
      }
    },
    // `only` ('video' | 'audio') leaves the capture of the other kind alone:
    // switching the microphone must not restart the camera, nor the other way
    // round — browsers that grant per capture (Firefox, Safari) would ask for
    // the untouched device all over again.
    // Resolves to false when a newer request overtook this one — its outcome
    // then says nothing about what is on show.
    async acquireStream(only) {
      const kinds = only ? [only] : ['video', 'audio']
      // A camera can take seconds to start (an iPhone has to wake up first),
      // long enough for the user to pick another one meanwhile. Only the
      // latest request for a kind may put its track on show; one that was
      // overtaken hands its device straight back.
      const tickets = {}
      for (const kind of kinds) tickets[kind] = ++this.streamRequests[kind]
      const overtaken = (kind) => kind in tickets && tickets[kind] !== this.streamRequests[kind]
      const allOvertaken = () => kinds.every(overtaken)
      this.stopTracks(kinds)
      const wantVideo =
        kinds.includes('video') && this.cameraActive && this.cameraStatus !== 'denied'
      const wantAudio = kinds.includes('audio') && this.micActive && this.micStatus !== 'denied'
      // Nothing to capture — explicitly opted out.
      if (!wantVideo && !wantAudio) return true
      const requestedCamera = this.selectedCamera
      const constraints = {
        video: wantVideo && this.deviceConstraint('videoinput', requestedCamera),
        audio: wantAudio && this.deviceConstraint('audioinput', this.selectedMic),
      }
      let stream
      let cameraError = null
      const starting = kinds.filter((kind) => (kind === 'video' ? wantVideo : wantAudio))
      for (const kind of starting) this.starting[kind]++
      this.showStarting()
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (videoErr) {
        if (allOvertaken()) return false
        // If video failed but audio was wanted, try audio-only as fallback.
        if (wantAudio && wantVideo) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: constraints.audio })
          } catch (_audioErr) {
            if (allOvertaken()) return false
            throw videoErr
          }
          cameraError = videoErr
        } else {
          throw videoErr
        }
      } finally {
        for (const kind of starting) this.starting[kind]--
        this.showStarting()
      }
      if (allOvertaken()) {
        stream.getTracks().forEach((t) => t.stop())
        return false
      }
      // What is on show already: the kind this request left alone, or one
      // that a newer request has put there in the meantime.
      const shown = this.stream ? this.stream.getTracks() : []
      const fresh = stream.getTracks().filter((t) => {
        if (!overtaken(t.kind)) return true
        t.stop()
        return false
      })
      const complete = shown.length === 0 && !kinds.some(overtaken)
      this.stream = complete ? stream : new MediaStream([...shown, ...fresh])
      // The microphone alone beats no preview at all, but a camera the user
      // asked for by name and did not get must not fail in silence. Without a
      // chosen camera there may simply be none, which is no error.
      this.permissionError =
        cameraError && requestedCamera ? this.permissionMessage(cameraError) : null
      this.$nextTick(() => {
        const v = this.$refs.previewEl
        // A new microphone is no reason to restart the picture.
        if (v && (kinds.includes('video') || !v.srcObject)) v.srcObject = this.stream
      })
      return !kinds.some(overtaken)
    },
    showStarting() {
      this.cameraStarting = this.starting.video > 0
      this.micStarting = this.starting.audio > 0
    },
    deviceLabel(devices, deviceId) {
      const device = devices.find((d) => d.deviceId === deviceId)
      return (device && device.label) || ''
    },
    stopTracks(kinds) {
      if (kinds.length > 1) {
        this.stopStream()
        return
      }
      if (kinds[0] === 'video') {
        const v = this.$refs.previewEl
        if (v) v.srcObject = null
      }
      if (!this.stream) return
      const staying = []
      for (const track of this.stream.getTracks()) {
        if (track.kind === kinds[0]) track.stop()
        else staying.push(track)
      }
      this.stream = staying.length ? new MediaStream(staying) : null
    },
    stopStream() {
      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop())
        this.stream = null
      }
      const v = this.$refs.previewEl
      if (v) v.srcObject = null
    },
    async onCameraChange(deviceId) {
      this.selectedCamera = deviceId
      try {
        const shown = await this.acquireStream('video')
        // Not one that was overtaken by a later choice, nor one that left the
        // preview without a picture.
        if (shown && (!this.cameraActive || this.hasVideo)) {
          this.rememberDevice('videoinput', this.cameras, deviceId)
        }
      } catch (err) {
        this.permissionError = this.permissionMessage(err)
      }
    },
    async onMicChange(deviceId) {
      this.selectedMic = deviceId
      try {
        if (await this.acquireStream('audio')) {
          this.rememberDevice('audioinput', this.mics, deviceId)
        }
      } catch (err) {
        this.permissionError = this.permissionMessage(err)
      }
    },
    async toggleMicActive() {
      if (this.micStatus === 'denied' || this.micStatus === 'unsupported') return
      const next = !this.micActive
      this.micActive = next
      this.permissionError = null
      try {
        await this.acquireStream('audio')
        if (next) await this.refreshPermissionStatus()
        if (this.micStatus === 'denied') this.micActive = false
      } catch (err) {
        this.permissionError = this.permissionMessage(err)
        this.micActive = false
      }
    },
    async toggleCameraActive() {
      if (this.cameraStatus === 'denied' || this.cameraStatus === 'unsupported') return
      const next = !this.cameraActive
      this.cameraActive = next
      this.permissionError = null
      try {
        await this.acquireStream('video')
        if (next) await this.refreshPermissionStatus()
        if (this.cameraStatus === 'denied') this.cameraActive = false
      } catch (err) {
        this.permissionError = this.permissionMessage(err)
        this.cameraActive = false
      }
    },
    onSpeakerChange(deviceId) {
      this.selectedSpeaker = deviceId
      this.rememberDevice('audiooutput', this.speakers, deviceId)
    },
    emitJoin() {
      // Browsers without navigator.permissions report 'prompt' as a fallback
      // even when getUserMedia already worked for the preview. Treat anything
      // that isn't a hard 'denied'/'unsupported' as usable — matches the
      // disabled state of the toggle buttons.
      const micEnabled =
        this.micActive && this.micStatus !== 'denied' && this.micStatus !== 'unsupported'
      const cameraEnabled =
        this.cameraActive && this.cameraStatus !== 'denied' && this.cameraStatus !== 'unsupported'
      // A device that is merely switched off for now still goes along: it is
      // the one to start once the user turns it on during the call.
      const usable = (status) => status !== 'denied' && status !== 'unsupported'
      const payload = {
        cameraDeviceId: (usable(this.cameraStatus) && this.selectedCamera) || null,
        micDeviceId: (usable(this.micStatus) && this.selectedMic) || null,
        speakerDeviceId: (this.speakerSupported && this.selectedSpeaker) || null,
        cameraEnabled,
        micEnabled,
      }
      this.stopStream()
      this.$emit('join', payload)
    },
  },
}
</script>

<style scoped>
.prejoin {
  /*  Flex into whatever vertical space the parent leaves after the header. */
  flex: 1;
  display: flex;
  background: var(--background-color-base);
  color: var(--text-color-base);
  overflow: auto;
  font-family: var(--font-family-text);
  min-height: 0;
}

.prejoin__preview {
  position: relative;
  flex: 1 1 60%;
  background: var(--color-neutral-10);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.prejoin__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.prejoin__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-small);
  color: var(--color-neutral-70);
  padding: var(--space-small);
  text-align: center;
  pointer-events: none;
}

.prejoin__avatar {
  pointer-events: auto;
}

.prejoin__placeholder-text {
  font-size: var(--font-size-small);
}

.prejoin__starting-device {
  display: block;
  font-size: var(--font-size-x-small);
  opacity: 0.85;
}

/*  Overlay at the bottom edge, so it stays readable on top of a running */
/*  picture as well as on the empty preview. */
.prejoin__mic-starting {
  position: absolute;
  bottom: var(--space-x-small);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-x-small);
  max-width: calc(100% - var(--space-base));
  padding: var(--space-xx-small) var(--space-small);
  border-radius: var(--border-radius-base);
  background: rgba(0, 0, 0, 0.65);
  color: var(--text-color-inverse);
  font-size: var(--font-size-small);
}

.prejoin__mic-starting-text {
  min-width: 0;
}

.prejoin__panel {
  flex: 1 1 40%;
  max-width: 460px;
  padding: var(--space-base);
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
  background: var(--background-color-soft);
  border-left: 1px solid var(--color-neutral-85);
}

.prejoin__title {
  margin: 0 0 var(--space-xxx-small);
  font-size: var(--font-size-large);
  font-family: var(--font-family-heading);
  font-weight: var(--text-weight-bold);
  color: var(--text-color-base);
}

.prejoin__description {
  margin: 0 0 var(--space-x-small);
  font-size: var(--font-size-small);
  color: var(--text-color-soft);
  line-height: 1.4;
}

.prejoin__device-toggles {
  display: flex;
  gap: var(--space-x-small);
  flex-wrap: wrap;
  justify-content: center;
  padding: var(--space-x-small) 0;
  border-top: 1px solid var(--color-neutral-85);
  border-bottom: 1px solid var(--color-neutral-85);
}

.prejoin__hint {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--text-color-soft);
  min-height: 1.2em;
  text-align: center;
}

.prejoin__error {
  display: flex;
  align-items: center;
  gap: var(--space-x-small);
  color: var(--text-color-danger);
  background: var(--color-danger-inverse);
  border: 1px solid var(--color-danger-light);
  padding: var(--space-x-small) var(--space-small);
  border-radius: var(--border-radius-base);
  font-size: var(--font-size-small);
}

.prejoin__error-text {
  flex: 1;
}

.prejoin__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-x-small);
  margin-top: auto;
}

@media (--vp-mobile) {
  .prejoin {
    flex-direction: column;
  }

  .prejoin__preview {
    min-height: 200px;
    flex: 0 0 35vh;
  }

  .prejoin__panel {
    max-width: none;
    flex: 1 1 auto;
    border-left: none;
    border-top: 1px solid var(--color-neutral-85);
  }
}
</style>
