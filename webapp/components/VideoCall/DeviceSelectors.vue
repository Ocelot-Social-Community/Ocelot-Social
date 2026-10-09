<template>
  <div class="device-selectors">
    <div class="device-selectors__row">
      <label class="device-selectors__label" :for="`${idPrefix}-camera`">
        {{ $t('videoCall.prejoin.camera') }}
        <span
          v-if="cameraStatus"
          :class="['device-selectors__status', `device-selectors__status--${cameraStatus}`]"
        >
          {{ $t(`videoCall.prejoin.permission.${cameraStatus}`) }}
        </span>
      </label>
      <select
        :id="`${idPrefix}-camera`"
        :value="selectedCamera"
        :disabled="cameras.length === 0"
        @change="$emit('camera-change', $event.target.value)"
      >
        <option v-if="cameras.length === 0" value="">
          {{ $t('videoCall.prejoin.noDevices') }}
        </option>
        <option
          v-for="d in cameras"
          :key="d.deviceId"
          :value="d.deviceId"
          :selected="d.deviceId === selectedCamera"
        >
          {{ d.label || $t('videoCall.prejoin.unnamedCamera') }}
        </option>
      </select>
    </div>

    <div class="device-selectors__row">
      <label class="device-selectors__label" :for="`${idPrefix}-mic`">
        {{ $t('videoCall.prejoin.microphone') }}
        <span
          v-if="micStatus"
          :class="['device-selectors__status', `device-selectors__status--${micStatus}`]"
        >
          {{ $t(`videoCall.prejoin.permission.${micStatus}`) }}
        </span>
      </label>
      <select
        :id="`${idPrefix}-mic`"
        :value="selectedMic"
        :disabled="mics.length === 0"
        @change="$emit('mic-change', $event.target.value)"
      >
        <option v-if="mics.length === 0" value="">
          {{ $t('videoCall.prejoin.noDevices') }}
        </option>
        <option
          v-for="d in mics"
          :key="d.deviceId"
          :value="d.deviceId"
          :selected="d.deviceId === selectedMic"
        >
          {{ d.label || $t('videoCall.prejoin.unnamedMic') }}
        </option>
      </select>
      <div
        v-if="meterStream"
        class="device-selectors__meter"
        :aria-label="$t('videoCall.prejoin.micLevel')"
      >
        <div ref="meterFill" class="device-selectors__meter-fill" />
      </div>
    </div>

    <div class="device-selectors__row">
      <label class="device-selectors__label" :for="`${idPrefix}-speaker`">
        {{ $t('videoCall.prejoin.speaker') }}
        <span class="device-selectors__status device-selectors__status--info">
          {{ speakerSupported ? '' : $t('videoCall.prejoin.speakerUnsupported') }}
        </span>
      </label>
      <div class="device-selectors__speaker-row">
        <select
          :id="`${idPrefix}-speaker`"
          :value="selectedSpeaker"
          :disabled="!speakerSupported || speakers.length === 0"
          @change="$emit('speaker-change', $event.target.value)"
        >
          <option v-if="speakers.length === 0" value="">
            {{ $t('videoCall.prejoin.noDevices') }}
          </option>
          <option
            v-for="d in speakers"
            :key="d.deviceId"
            :value="d.deviceId"
            :selected="d.deviceId === selectedSpeaker"
          >
            {{ d.label || $t('videoCall.prejoin.unnamedSpeaker') }}
          </option>
        </select>
        <os-button appearance="outline" size="sm" :disabled="testingTone" @click="playTestTone">
          <template #icon><os-icon :icon="icons.headphones" /></template>
          {{
            testingTone ? $t('videoCall.prejoin.testingSound') : $t('videoCall.prejoin.testSound')
          }}
        </os-button>
      </div>
      <audio ref="speakerTestEl" preload="auto" />
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

// Every <option> carries its own `selected`: the list and the selection
// usually arrive in one update, and Vue sets the <select>'s `value` before it
// has rendered the new options — the browser then shows the first entry
// instead, which can no longer be picked because it looks picked already.
//
// The three device rows shared by the pre-join dialog and the in-call device
// settings. Which devices exist and which one is selected is the parent's
// business; the level meter and the test tone live here.
export default {
  name: 'DeviceSelectors',
  components: { OsButton, OsIcon },
  props: {
    // Both users are never on screen together, but their ids must not collide
    // with anything else on the page either.
    idPrefix: {
      type: String,
      required: true,
    },
    cameras: {
      type: Array,
      default: () => [],
    },
    mics: {
      type: Array,
      default: () => [],
    },
    speakers: {
      type: Array,
      default: () => [],
    },
    selectedCamera: {
      type: String,
      default: '',
    },
    selectedMic: {
      type: String,
      default: '',
    },
    selectedSpeaker: {
      type: String,
      default: '',
    },
    // granted | prompt | denied | unsupported — no badge when left out.
    cameraStatus: {
      type: String,
      default: null,
    },
    micStatus: {
      type: String,
      default: null,
    },
    // MediaStream carrying the microphone to show the level of; no meter
    // without it.
    meterStream: {
      type: null,
      default: null,
    },
  },
  data() {
    return {
      testingTone: false,
    }
  },
  computed: {
    speakerSupported() {
      return (
        typeof window !== 'undefined' &&
        typeof HTMLMediaElement !== 'undefined' &&
        typeof HTMLMediaElement.prototype.setSinkId === 'function'
      )
    },
  },
  watch: {
    meterStream: {
      immediate: true,
      handler(stream) {
        if (stream) this.startMeter(stream)
        else this.stopMeter()
      },
    },
  },
  beforeCreate() {
    // Non-reactive scratch state. Set before the immediate `meterStream`
    // watcher runs — it does so ahead of created().
    this.audioCtx = null
    this.meterRaf = null
    // Deliberately not reactive, see setMicLevel().
    this.micLevelPercent = 0
  },
  created() {
    this.icons = iconRegistry
  },
  beforeDestroy() {
    this.stopMeter()
  },
  methods: {
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
      this.audioCtx = ctx
      const tick = () => {
        analyser.getByteTimeDomainData(buffer)
        let sumSq = 0
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128
          sumSq += v * v
        }
        const rms = Math.sqrt(sumSq / buffer.length)
        this.setMicLevel(Math.min(100, Math.round(rms * 200)))
        this.meterRaf = requestAnimationFrame(tick)
      }
      tick()
    },
    stopMeter() {
      if (this.meterRaf) {
        cancelAnimationFrame(this.meterRaf)
        this.meterRaf = null
      }
      if (this.audioCtx) {
        try {
          this.audioCtx.close()
        } catch (_e) {
          /* noop */
        }
        this.audioCtx = null
      }
      this.setMicLevel(0)
    },
    setMicLevel(percent) {
      // Written straight to the element instead of through a render: the level
      // changes many times a second, and every render also patches the
      // <select>s and their options. Firefox rebuilds an open dropdown on each
      // such change and then drops the user's click on an entry — with sound in
      // the room the device could not be switched at all.
      this.micLevelPercent = percent
      const fill = this.$refs.meterFill
      if (fill) fill.style.width = `${percent}%`
    },
    async playTestTone() {
      if (this.testingTone) return
      this.testingTone = true
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) {
        this.testingTone = false
        return
      }
      // Declared outside the try so the outer catch can close it on any
      // failure between creation and oscillator.onended — otherwise each
      // failed test tone leaks an AudioContext (browsers cap at ~6).
      let ctx = null
      try {
        ctx = new AC()
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
        if (ctx) {
          try {
            await ctx.close()
          } catch (_closeErr) {
            /* noop */
          }
        }
        this.testingTone = false
      }
    },
  },
}
</script>

<style scoped>
.device-selectors {
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
}

.device-selectors__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxx-small);

  select {
    background: var(--background-color-base);
    color: var(--text-color-base);
    border: 1px solid var(--color-neutral-70);
    padding: var(--space-xx-small) var(--space-x-small);
    border-radius: var(--border-radius-base);
    width: 100%;
    font-family: var(--font-family-text);
    font-size: var(--font-size-base);
  }
}

.device-selectors__label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: var(--text-weight-bold);
  font-size: var(--font-size-base);
  color: var(--text-color-base);
}

.device-selectors__status {
  font-weight: var(--text-weight-regular);
  font-size: var(--font-size-x-small);
  padding: 2px var(--space-x-small);
  border-radius: var(--border-radius-rounded);
  background: var(--color-neutral-80);
  color: var(--text-color-base);
}

.device-selectors__status--granted {
  background: var(--color-primary);
  color: var(--color-primary-inverse);
}

.device-selectors__status--prompt {
  background: var(--color-warning);
  color: var(--color-warning-inverse);
}

.device-selectors__status--denied {
  background: var(--color-danger);
  color: var(--color-danger-inverse);
}

.device-selectors__status--unsupported,
.device-selectors__status--info {
  background: transparent;
  color: var(--text-color-softer);
}

.device-selectors__meter {
  height: 6px;
  background: var(--color-neutral-85);
  border-radius: var(--border-radius-rounded);
  overflow: hidden;
}

.device-selectors__meter-fill {
  width: 0;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--color-primary) 0%,
    var(--color-warning) 70%,
    var(--color-danger) 100%
  );
  transition: width 80ms linear;
}

.device-selectors__speaker-row {
  display: flex;
  gap: var(--space-x-small);
  align-items: center;

  select {
    flex: 1;
    /*  Long device names would otherwise push the test button out of the row. */
    min-width: 0;
  }
}
</style>
