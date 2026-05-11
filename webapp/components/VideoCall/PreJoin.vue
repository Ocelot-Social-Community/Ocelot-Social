<template>
  <div class="prejoin">
    <div class="prejoin__preview">
      <video
        ref="previewEl"
        autoplay
        muted
        playsinline
        class="prejoin__video"
      />
      <div v-if="!hasVideo" class="prejoin__placeholder">
        {{
          cameraActive
            ? $t('videoCall.prejoin.noCamera')
            : $t('videoCall.prejoin.cameraDisabled')
        }}
      </div>
    </div>

    <div class="prejoin__panel">
      <h2 class="prejoin__title">
        {{ $t('videoCall.prejoin.title') }}
      </h2>

      <div class="prejoin__row">
        <label class="prejoin__label" for="prejoin-camera">
          {{ $t('videoCall.prejoin.camera') }}
          <span :class="['prejoin__status', `prejoin__status--${cameraStatus}`]">
            {{ $t(`videoCall.prejoin.permission.${cameraStatus}`) }}
          </span>
        </label>
        <select
          id="prejoin-camera"
          :value="selectedCamera"
          :disabled="cameras.length === 0"
          @change="onCameraChange"
        >
          <option v-if="cameras.length === 0" value="">
            {{ $t('videoCall.prejoin.noDevices') }}
          </option>
          <option
            v-for="d in cameras"
            :key="d.deviceId"
            :value="d.deviceId"
          >
            {{ d.label || $t('videoCall.prejoin.unnamedCamera') }}
          </option>
        </select>
      </div>

      <div class="prejoin__row">
        <label class="prejoin__label" for="prejoin-mic">
          {{ $t('videoCall.prejoin.microphone') }}
          <span :class="['prejoin__status', `prejoin__status--${micStatus}`]">
            {{ $t(`videoCall.prejoin.permission.${micStatus}`) }}
          </span>
        </label>
        <select
          id="prejoin-mic"
          :value="selectedMic"
          :disabled="mics.length === 0"
          @change="onMicChange"
        >
          <option v-if="mics.length === 0" value="">
            {{ $t('videoCall.prejoin.noDevices') }}
          </option>
          <option
            v-for="d in mics"
            :key="d.deviceId"
            :value="d.deviceId"
          >
            {{ d.label || $t('videoCall.prejoin.unnamedMic') }}
          </option>
        </select>
        <div
          v-if="micActive"
          class="prejoin__meter"
          :aria-label="$t('videoCall.prejoin.micLevel')"
        >
          <div class="prejoin__meter-fill" :style="{ width: micLevelPercent + '%' }" />
        </div>
      </div>

      <div class="prejoin__row">
        <label class="prejoin__label" for="prejoin-speaker">
          {{ $t('videoCall.prejoin.speaker') }}
          <span class="prejoin__status prejoin__status--info">
            {{ speakerSupported ? '' : $t('videoCall.prejoin.speakerUnsupported') }}
          </span>
        </label>
        <div class="prejoin__speaker-row">
          <select
            id="prejoin-speaker"
            :value="selectedSpeaker"
            :disabled="!speakerSupported || speakers.length === 0"
            @change="onSpeakerChange"
          >
            <option v-if="speakers.length === 0" value="">
              {{ $t('videoCall.prejoin.noDevices') }}
            </option>
            <option
              v-for="d in speakers"
              :key="d.deviceId"
              :value="d.deviceId"
            >
              {{ d.label || $t('videoCall.prejoin.unnamedSpeaker') }}
            </option>
          </select>
          <os-button
            appearance="outline"
            size="sm"
            :disabled="testingTone"
            @click="playTestTone"
          >
            <template #icon><os-icon :icon="icons.headphones" /></template>
            {{ testingTone ? $t('videoCall.prejoin.testingSound') : $t('videoCall.prejoin.testSound') }}
          </os-button>
        </div>
        <audio ref="speakerTestEl" preload="auto" />
      </div>

      <div v-if="permissionError" class="prejoin__error" role="alert">
        <span class="prejoin__error-text">{{ permissionError }}</span>
        <os-button
          appearance="outline"
          variant="danger"
          size="sm"
          @click="retry"
        >
          <template #icon><os-icon :icon="icons.refresh" /></template>
          {{ $t('videoCall.prejoin.retry') }}
        </os-button>
      </div>

      <div class="prejoin__device-toggles">
        <os-button
          :variant="micActive ? 'primary' : 'default'"
          appearance="outline"
          :disabled="micStatus === 'denied' || micStatus === 'unsupported'"
          :aria-pressed="(!micActive).toString()"
          @click="toggleMicActive"
        >
          <template #icon>
            <os-icon :icon="micActive ? icons.microphone : icons.microphoneSlash" />
          </template>
          {{ micActive ? $t('videoCall.prejoin.micOn') : $t('videoCall.prejoin.micOff') }}
        </os-button>
        <os-button
          :variant="cameraActive ? 'primary' : 'default'"
          appearance="outline"
          :disabled="cameraStatus === 'denied' || cameraStatus === 'unsupported'"
          :aria-pressed="(!cameraActive).toString()"
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
          appearance="ghost"
          @click="$emit('cancel')"
        >
          <template #icon><os-icon :icon="icons.close" /></template>
          {{ $t('videoCall.prejoin.cancel') }}
        </os-button>
        <os-button
          variant="primary"
          @click="emitJoin"
        >
          <template #icon><os-icon :icon="icons.phone" /></template>
          {{ $t('videoCall.prejoin.join') }}
        </os-button>
      </div>
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'PreJoin',
  components: { OsButton, OsIcon },
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
      micLevelPercent: 0,
      testingTone: false,
      permissionError: null,
      stream: null,
    }
  },
  computed: {
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
  },
  async mounted() {
    await this.initDevices()
  },
  beforeDestroy() {
    this.stopMeter()
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
      try {
        await this.acquireStream()
      } catch (err) {
        this.permissionError = this.permissionMessage(err)
      }
      await this.refreshPermissionStatus()
      if (this.cameraStatus === 'denied') this.cameraActive = false
      if (this.micStatus === 'denied') this.micActive = false
      await this.enumerate()
      navigator.mediaDevices.addEventListener('devicechange', this.onDeviceChange)
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
      if (!this._permListeners) this._permListeners = {}
      // Already listening on this PermissionStatus — nothing to do.
      if (this._permListeners[kind] && this._permListeners[kind].status === status) return
      // Detach previous listener (PermissionStatus instance may change on query).
      this.detachPermissionListener(kind)
      const handler = () => this.onPermissionChange(kind, status.state)
      try {
        status.addEventListener('change', handler)
      } catch (_e) {
        return
      }
      this._permListeners[kind] = { status, handler }
    },
    detachPermissionListener(kind) {
      const entry = this._permListeners && this._permListeners[kind]
      if (!entry) return
      try {
        entry.status.removeEventListener('change', entry.handler)
      } catch (_e) {
        /* noop */
      }
      delete this._permListeners[kind]
    },
    detachPermissionListeners() {
      if (!this._permListeners) return
      for (const kind of Object.keys(this._permListeners)) {
        this.detachPermissionListener(kind)
      }
      this._permListeners = null
    },
    async onPermissionChange(kind, newState) {
      if (kind === 'camera') this.cameraStatus = newState
      if (kind === 'microphone') this.micStatus = newState
      // The user just granted the permission in the browser UI (lock icon /
      // settings) — re-acquire the stream and clear the error in place.
      if (newState === 'granted') {
        if (kind === 'camera') this.cameraActive = true
        if (kind === 'microphone') this.micActive = true
        try {
          await this.acquireStream()
          this.permissionError = null
        } catch (err) {
          this.permissionError = this.permissionMessage(err)
        }
        await this.enumerate()
      } else if (newState === 'denied') {
        if (kind === 'camera') this.cameraActive = false
        if (kind === 'microphone') this.micActive = false
        try {
          await this.acquireStream()
        } catch (_e) {
          /* noop */
        }
      }
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
        this.cameras = devices.filter((d) => d.kind === 'videoinput')
        this.mics = devices.filter((d) => d.kind === 'audioinput')
        this.speakers = devices.filter((d) => d.kind === 'audiooutput')
        if (!this.selectedCamera && this.cameras[0]) this.selectedCamera = this.cameras[0].deviceId
        if (!this.selectedMic && this.mics[0]) this.selectedMic = this.mics[0].deviceId
        if (!this.selectedSpeaker && this.speakers[0]) this.selectedSpeaker = this.speakers[0].deviceId
      } catch (_e) {
        /* noop */
      }
    },
    async acquireStream() {
      this.stopStream()
      const wantVideo = this.cameraActive && this.cameraStatus !== 'denied'
      const wantAudio = this.micActive && this.micStatus !== 'denied'
      if (!wantVideo && !wantAudio) {
        // Nothing to preview — explicitly opted out of both.
        this.stream = null
        return
      }
      const constraints = {
        video: wantVideo
          ? this.selectedCamera
            ? { deviceId: { exact: this.selectedCamera } }
            : true
          : false,
        audio: wantAudio
          ? this.selectedMic
            ? { deviceId: { exact: this.selectedMic } }
            : true
          : false,
      }
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (videoErr) {
        // If video failed but audio was wanted, try audio-only as fallback.
        if (wantAudio && wantVideo) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: this.selectedMic
                ? { deviceId: { exact: this.selectedMic } }
                : true,
            })
          } catch (_audioErr) {
            throw videoErr
          }
        } else {
          throw videoErr
        }
      }
      this.stream = stream
      this.permissionError = null
      this.$nextTick(() => {
        const v = this.$refs.previewEl
        if (v) v.srcObject = stream
        if (wantAudio) this.startMeter(stream)
      })
    },
    stopStream() {
      this.stopMeter()
      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop())
        this.stream = null
      }
      const v = this.$refs.previewEl
      if (v) v.srcObject = null
    },
    startMeter(stream) {
      this.stopMeter()
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) return
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      const buffer = new Uint8Array(analyser.frequencyBinCount)
      this._audioCtx = ctx
      const tick = () => {
        analyser.getByteTimeDomainData(buffer)
        let sumSq = 0
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128
          sumSq += v * v
        }
        const rms = Math.sqrt(sumSq / buffer.length)
        this.micLevelPercent = Math.min(100, Math.round(rms * 200))
        this._meterRaf = requestAnimationFrame(tick)
      }
      tick()
    },
    stopMeter() {
      if (this._meterRaf) {
        cancelAnimationFrame(this._meterRaf)
        this._meterRaf = null
      }
      if (this._audioCtx) {
        try {
          this._audioCtx.close()
        } catch (_e) {
          /* noop */
        }
        this._audioCtx = null
      }
      this.micLevelPercent = 0
    },
    async onCameraChange(e) {
      this.selectedCamera = e.target.value
      try {
        await this.acquireStream()
      } catch (err) {
        this.permissionError = this.permissionMessage(err)
      }
    },
    async onMicChange(e) {
      this.selectedMic = e.target.value
      try {
        await this.acquireStream()
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
        await this.acquireStream()
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
        await this.acquireStream()
        if (next) await this.refreshPermissionStatus()
        if (this.cameraStatus === 'denied') this.cameraActive = false
      } catch (err) {
        this.permissionError = this.permissionMessage(err)
        this.cameraActive = false
      }
    },
    async onSpeakerChange(e) {
      this.selectedSpeaker = e.target.value
      const audio = this.$refs.speakerTestEl
      if (audio && this.speakerSupported && this.selectedSpeaker) {
        try {
          await audio.setSinkId(this.selectedSpeaker)
        } catch (_e) {
          /* ignore */
        }
      }
    },
    async playTestTone() {
      if (this.testingTone) return
      this.testingTone = true
      try {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) {
          this.testingTone = false
          return
        }
        const ctx = new AC()
        if (ctx.state === 'suspended') {
          try {
            await ctx.resume()
          } catch (_e) {
            /* noop */
          }
        }
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.type = 'sine'

        // Small ascending arpeggio: C4 — E4 — G4 — C5 (major chord).
        const NOTES = [261.63, 329.63, 392.0, 523.25]
        const NOTE_LEN = 0.18
        const GAP = 0.02
        const PEAK = 0.25
        const now = ctx.currentTime
        const totalDuration = NOTES.length * (NOTE_LEN + GAP)

        gain.gain.setValueAtTime(0, now)
        NOTES.forEach((freq, i) => {
          const start = now + i * (NOTE_LEN + GAP)
          oscillator.frequency.setValueAtTime(freq, start)
          gain.gain.setValueAtTime(0, start)
          gain.gain.linearRampToValueAtTime(PEAK, start + 0.03)
          gain.gain.setValueAtTime(PEAK, start + NOTE_LEN - 0.04)
          gain.gain.linearRampToValueAtTime(0, start + NOTE_LEN)
        })

        const audio = this.$refs.speakerTestEl
        const canRouteToSink =
          audio &&
          this.speakerSupported &&
          this.selectedSpeaker &&
          typeof ctx.createMediaStreamDestination === 'function'

        if (canRouteToSink) {
          const dest = ctx.createMediaStreamDestination()
          oscillator.connect(gain).connect(dest)
          audio.srcObject = dest.stream
          try {
            await audio.setSinkId(this.selectedSpeaker)
          } catch (_e) {
            /* fall back to default output */
          }
          try {
            await audio.play()
          } catch (_e) {
            /* noop */
          }
        } else {
          oscillator.connect(gain).connect(ctx.destination)
        }

        oscillator.start(now)
        oscillator.stop(now + totalDuration)
        oscillator.onended = () => {
          if (audio) {
            try {
              audio.pause()
              audio.srcObject = null
            } catch (_e) {
              /* noop */
            }
          }
          try {
            ctx.close()
          } catch (_e) {
            /* noop */
          }
          this.testingTone = false
        }
      } catch (_e) {
        this.testingTone = false
      }
    },
    emitJoin() {
      const micEnabled = this.micActive && this.micStatus === 'granted'
      const cameraEnabled = this.cameraActive && this.cameraStatus === 'granted'
      const payload = {
        cameraDeviceId: cameraEnabled ? this.selectedCamera : null,
        micDeviceId: micEnabled ? this.selectedMic : null,
        speakerDeviceId: this.speakerSupported ? this.selectedSpeaker : null,
        cameraEnabled,
        micEnabled,
      }
      this.stopStream()
      this.$emit('join', payload)
    },
  },
}
</script>

<style lang="scss" scoped>
.prejoin {
  position: absolute;
  inset: 0;
  display: flex;
  background: $background-color-base;
  color: $text-color-base;
  overflow: auto;
  font-family: $font-family-text;
}

.prejoin__preview {
  position: relative;
  flex: 1 1 60%;
  background: $color-neutral-10;
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
  align-items: center;
  justify-content: center;
  color: $color-neutral-70;
  padding: $space-small;
  text-align: center;
  pointer-events: none;
}

.prejoin__panel {
  flex: 1 1 40%;
  max-width: 460px;
  padding: $space-base;
  display: flex;
  flex-direction: column;
  gap: $space-small;
  background: $background-color-soft;
  border-left: 1px solid $color-neutral-85;
}

.prejoin__title {
  margin: 0 0 $space-x-small;
  font-size: $font-size-large;
  font-family: $font-family-heading;
  color: $text-color-base;
}

.prejoin__row {
  display: flex;
  flex-direction: column;
  gap: $space-xxx-small;

  select {
    background: $background-color-base;
    color: $text-color-base;
    border: 1px solid $color-neutral-70;
    padding: $space-xx-small $space-x-small;
    border-radius: $border-radius-base;
    width: 100%;
    font-family: $font-family-text;
    font-size: $font-size-base;
  }
}

.prejoin__label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: $font-weight-bold;
  font-size: $font-size-base;
  color: $text-color-base;
}

.prejoin__status {
  font-weight: $font-weight-regular;
  font-size: $font-size-x-small;
  padding: 2px $space-x-small;
  border-radius: $border-radius-rounded;
  background: $color-neutral-80;
  color: $text-color-base;

  &--granted {
    background: $color-primary;
    color: $color-primary-inverse;
  }
  &--prompt {
    background: $color-warning;
    color: $color-warning-inverse;
  }
  &--denied {
    background: $color-danger;
    color: $color-danger-inverse;
  }
  &--unsupported,
  &--info {
    background: transparent;
    color: $text-color-softer;
  }
}

.prejoin__meter {
  height: 6px;
  background: $color-neutral-85;
  border-radius: $border-radius-rounded;
  overflow: hidden;
}

.prejoin__meter-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    $color-primary 0%,
    $color-warning 70%,
    $color-danger 100%
  );
  transition: width 80ms linear;
}

.prejoin__speaker-row {
  display: flex;
  gap: $space-x-small;
  align-items: center;

  select {
    flex: 1;
  }
}

.prejoin__device-toggles {
  display: flex;
  gap: $space-x-small;
  flex-wrap: wrap;
  justify-content: center;
  padding: $space-x-small 0;
  border-top: 1px solid $color-neutral-85;
  border-bottom: 1px solid $color-neutral-85;
}

.prejoin__hint {
  margin: 0;
  font-size: $font-size-small;
  color: $text-color-soft;
  min-height: 1.2em;
  text-align: center;
}

.prejoin__error {
  display: flex;
  align-items: center;
  gap: $space-x-small;
  color: $text-color-danger;
  background: $color-danger-inverse;
  border: 1px solid $color-danger-light;
  padding: $space-x-small $space-small;
  border-radius: $border-radius-base;
  font-size: $font-size-small;
}

.prejoin__error-text {
  flex: 1;
}

.prejoin__actions {
  display: flex;
  justify-content: flex-end;
  gap: $space-x-small;
  margin-top: auto;
}

@media (max-width: 810px) {
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
    border-top: 1px solid $color-neutral-85;
  }
}
</style>
