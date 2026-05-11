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
        {{ $t('videoCall.prejoin.noCamera') }}
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
        <div class="prejoin__meter" :aria-label="$t('videoCall.prejoin.micLevel')">
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
          <button
            type="button"
            class="prejoin__btn"
            @click="playTestTone"
            :disabled="testingTone"
          >
            {{ testingTone ? $t('videoCall.prejoin.testingSound') : $t('videoCall.prejoin.testSound') }}
          </button>
        </div>
        <audio ref="speakerTestEl" preload="auto" />
      </div>

      <div v-if="permissionError" class="prejoin__error">
        {{ permissionError }}
      </div>

      <div class="prejoin__actions">
        <button
          type="button"
          class="prejoin__btn prejoin__btn--ghost"
          @click="$emit('cancel')"
        >
          {{ $t('videoCall.prejoin.cancel') }}
        </button>
        <button
          type="button"
          class="prejoin__btn prejoin__btn--primary"
          :disabled="!canJoin"
          @click="emitJoin"
        >
          {{ $t('videoCall.prejoin.join') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PreJoin',
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
    canJoin() {
      // Require at least one of mic/camera to be granted so the user can be heard or seen.
      const ok = (s) => s === 'granted'
      return ok(this.cameraStatus) || ok(this.micStatus)
    },
  },
  async mounted() {
    await this.initDevices()
  },
  beforeDestroy() {
    this.stopMeter()
    this.stopStream()
  },
  methods: {
    async initDevices() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.cameraStatus = 'unsupported'
        this.micStatus = 'unsupported'
        this.permissionError = this.$t('videoCall.prejoin.unsupportedBrowser')
        return
      }
      await this.refreshPermissionStatus()
      // Trigger getUserMedia to surface a permission prompt if needed
      try {
        await this.acquireStream()
      } catch (err) {
        this.permissionError = this.permissionMessage(err)
      }
      await this.refreshPermissionStatus()
      await this.enumerate()
      // Listen for device changes
      navigator.mediaDevices.addEventListener('devicechange', this.onDeviceChange)
    },
    onDeviceChange() {
      this.enumerate()
    },
    async refreshPermissionStatus() {
      const probe = async (name) => {
        if (!navigator.permissions || !navigator.permissions.query) return 'prompt'
        try {
          const res = await navigator.permissions.query({ name })
          return res.state
        } catch {
          return 'prompt'
        }
      }
      this.cameraStatus = await probe('camera')
      this.micStatus = await probe('microphone')
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
      const constraints = {
        video: this.selectedCamera ? { deviceId: { exact: this.selectedCamera } } : true,
        audio: this.selectedMic ? { deviceId: { exact: this.selectedMic } } : true,
      }
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (videoErr) {
        // Try audio-only as a fallback so the user can still participate by voice.
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: this.selectedMic ? { deviceId: { exact: this.selectedMic } } : true,
          })
        } catch (_audioErr) {
          throw videoErr
        }
      }
      this.stream = stream
      this.permissionError = null
      this.$nextTick(() => {
        const v = this.$refs.previewEl
        if (v) v.srcObject = stream
        this.startMeter(stream)
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
        // Some browsers start the context suspended; resume on user gesture.
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
        oscillator.frequency.value = 440
        // Soft attack/release to avoid clicks.
        const now = ctx.currentTime
        const duration = 0.6
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.25, now + 0.04)
        gain.gain.setValueAtTime(0.25, now + duration - 0.05)
        gain.gain.linearRampToValueAtTime(0, now + duration)

        const audio = this.$refs.speakerTestEl
        const canRouteToSink =
          audio &&
          this.speakerSupported &&
          this.selectedSpeaker &&
          typeof ctx.createMediaStreamDestination === 'function'

        if (canRouteToSink) {
          // Route via MediaStreamAudioDestinationNode → <audio> so setSinkId applies.
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
            /* user-gesture missing — keep going, oscillator still runs */
          }
        } else {
          oscillator.connect(gain).connect(ctx.destination)
        }

        oscillator.start(now)
        oscillator.stop(now + duration)
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
      // Stop the preview stream so LiveKit can grab the devices itself.
      const payload = {
        cameraDeviceId: this.cameraStatus === 'granted' ? this.selectedCamera : null,
        micDeviceId: this.micStatus === 'granted' ? this.selectedMic : null,
        speakerDeviceId: this.speakerSupported ? this.selectedSpeaker : null,
        cameraEnabled: this.cameraStatus === 'granted',
        micEnabled: this.micStatus === 'granted',
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
  color: $color-neutral-70;
  padding: $space-small;
  text-align: center;
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

.prejoin__btn {
  background: $background-color-base;
  color: $text-color-base;
  border: 1px solid $color-neutral-70;
  padding: $space-xx-small $space-base;
  border-radius: $border-radius-base;
  font-family: $font-family-text;
  font-size: $font-size-base;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color $duration-short ease;

  &:hover:not(:disabled) {
    background: $background-color-softer;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--primary {
    background: $color-primary;
    border-color: $color-primary;
    color: $color-primary-inverse;

    &:hover:not(:disabled) {
      background: $color-primary-active;
      border-color: $color-primary-active;
    }
  }

  &--ghost {
    background: transparent;
  }
}

.prejoin__error {
  color: $text-color-danger;
  background: $color-danger-inverse;
  border: 1px solid $color-danger-light;
  padding: $space-x-small $space-small;
  border-radius: $border-radius-base;
  font-size: $font-size-small;
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
