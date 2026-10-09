<template>
  <div
    :class="[
      'video-tile',
      {
        'video-tile--screen': tile.isScreen,
        'video-tile--speaking': isActiveSpeaker && !tile.isScreen,
        'video-tile--clickable': clickable,
      },
    ]"
    :role="clickable ? 'button' : null"
    :tabindex="clickable ? 0 : null"
    @click="onSelect"
    @keydown.enter="onSelect"
    @keydown.space="onSpaceKey"
  >
    <video v-show="hasVideo" ref="videoEl" autoplay playsinline :muted="tile.isLocal" />
    <audio v-if="!tile.isLocal" ref="audioEl" autoplay />
    <div
      v-if="showOwnScreenPlaceholder"
      class="video-tile__fallback video-tile__fallback--own-screen"
    >
      <os-icon :icon="icons.desktop" class="video-tile__fallback-icon" />
      <span class="video-tile__fallback-text">
        {{ $t('videoCall.youAreSharingScreen') }}
      </span>
    </div>
    <div
      v-else-if="!hasVideo && tile.isScreen"
      class="video-tile__fallback video-tile__fallback--own-screen"
    >
      <os-icon :icon="icons.desktop" class="video-tile__fallback-icon" />
      <span class="video-tile__fallback-text">
        {{ $t('videoCall.screenShareEnded') }}
      </span>
    </div>
    <div v-else-if="!hasVideo" class="video-tile__fallback">
      <!-- Tiles outside the minimized window's primary slot are display:none,
           where a lazy image never gets fetched — load avatars eagerly. -->
      <avatar-image :profile="tile.profile" :size="avatarSize" loading="eager" />
      <span v-if="tile.isLocal && avatarSize !== 'small'" class="video-tile__fallback-text">
        {{ $t('videoCall.prejoin.cameraDisabled') }}
      </span>
    </div>
    <!--
      A camera or microphone of one's own that is on its way — it can take
      seconds, and without a sign the tile just looks stuck. Before the label
      in the DOM, so the name stays readable on top of the dimmed picture.
    -->
    <div
      v-if="cameraStarting"
      class="video-tile__starting"
      role="status"
      :aria-label="$t('videoCall.prejoin.cameraStarting')"
      data-test="video-tile-camera-starting"
    >
      <os-spinner :size="avatarSize === 'small' ? 'lg' : '2xl'" />
      <span v-if="avatarSize !== 'small'" class="video-tile__starting-text">
        {{ $t('videoCall.prejoin.cameraStarting') }}
      </span>
    </div>
    <div
      v-if="micStarting"
      class="video-tile__mic-starting"
      role="status"
      :aria-label="$t('videoCall.prejoin.micStarting')"
      data-test="video-tile-mic-starting"
    >
      <os-spinner size="sm" />
      <span v-if="avatarSize !== 'small'">
        {{ $t('videoCall.prejoin.micStarting') }}
      </span>
    </div>
    <div class="video-tile__label">
      {{ tile.name }}
      <os-icon
        v-if="!tile.isScreen"
        :icon="tile.micEnabled ? icons.microphone : icons.microphoneSlash"
        class="video-tile__mic-status"
        :class="{ 'video-tile__mic-status--muted': !tile.micEnabled }"
        :aria-label="tile.micEnabled ? $t('videoCall.micUnmuted') : $t('videoCall.micMuted')"
      />
      <span
        v-if="weakConnectionLabel"
        class="video-tile__connection"
        :class="{ 'video-tile__connection--lost': tile.connectionQuality === 'lost' }"
        role="img"
        :title="weakConnectionLabel"
        :aria-label="weakConnectionLabel"
        data-test="video-tile-weak-connection"
      >
        <os-icon :icon="icons.warning" />
      </span>
      <span v-if="tile.isLocal" class="video-tile__local-tag">({{ $t('videoCall.you') }})</span>
      <span v-if="tile.isScreen" class="video-tile__screen-tag">
        — {{ $t('videoCall.screenShare') }}
      </span>
    </div>
    <div v-if="isSpotlighted" class="video-tile__pin" :aria-label="$t('videoCall.spotlightExit')">
      <os-icon :icon="icons.expand" />
    </div>
  </div>
</template>

<script>
import { OsIcon, OsSpinner } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'

export default {
  name: 'VideoTile',
  components: { AvatarImage, OsIcon, OsSpinner },
  props: {
    tile: {
      type: Object,
      required: true,
    },
    sinkId: {
      type: String,
      default: null,
    },
    isActiveSpeaker: {
      type: Boolean,
      default: false,
    },
    clickable: {
      type: Boolean,
      default: false,
    },
    isSpotlighted: {
      type: Boolean,
      default: false,
    },
    cameraStarting: {
      type: Boolean,
      default: false,
    },
    micStarting: {
      type: Boolean,
      default: false,
    },
    avatarSize: {
      // Forwarded to AvatarImage. 'small' renders the round avatar at the
      // round 40-ish px size, 'large' at the much larger one. Pass 'small'
      // for tightly-packed thumbnails so the avatar doesn't get squished.
      type: String,
      default: 'large',
      validator: (value) => !value || /^(small|large)$/.test(value),
    },
  },
  emits: ['select'],
  data() {
    return {
      attachedVideo: null,
      attachedAudio: null,
      videoEnded: false,
    }
  },
  created() {
    this.icons = iconRegistry
    // Non-reactive bookkeeping for the 'ended' listener — nothing renders off
    // these, so keeping them out of data() avoids needless reactivity.
    this.endedTrack = null
    this.onTrackEnded = null
  },
  computed: {
    weakConnectionLabel() {
      // Only the bad states are worth the space: a badge on every healthy
      // tile would just be noise. LiveKit rates the participant, so the own
      // tile tells whether the trouble is on this side of the call.
      if (this.tile.isScreen) return null
      const key = { poor: 'connectionPoor', lost: 'connectionLost' }[this.tile.connectionQuality]
      if (!key) return null
      return this.$t(`videoCall.${key}`, { name: this.tile.name })
    },
    showOwnScreenPlaceholder() {
      // Rendering the local screen share back to the user creates an infinite
      // mirror (the tab being captured shows the captured tab…). Show a
      // static placeholder instead. Remote participants still see the actual
      // shared screen.
      return this.tile.isScreen && this.tile.isLocal
    },
    hasVideo() {
      if (this.showOwnScreenPlaceholder) return false
      return !!this.tile.videoTrack && !this.videoEnded
    },
  },
  watch: {
    'tile.videoTrack': {
      immediate: true,
      handler() {
        // A new track earns a clean slate — the previous one having ended says
        // nothing about this one.
        this.videoEnded = false
        this.$nextTick(this.attachVideo)
      },
    },
    'tile.audioTrack': {
      immediate: true,
      handler() {
        this.$nextTick(this.attachAudio)
      },
    },
    sinkId() {
      this.applySinkId()
    },
  },
  beforeDestroy() {
    this.detachAll()
  },
  methods: {
    onSelect() {
      if (!this.clickable) return
      this.$emit('select', this.tile)
    },
    onSpaceKey(event) {
      // Only swallow Space (preventing page scroll) when the tile is actually
      // acting as a button — otherwise Space should behave normally for a
      // focused but non-interactive element.
      if (!this.clickable) return
      event.preventDefault()
      this.onSelect()
    },
    async applySinkId() {
      const el = this.$refs.audioEl
      if (!el || !this.sinkId || typeof el.setSinkId !== 'function') return
      try {
        await el.setSinkId(this.sinkId)
      } catch (_e) {
        /* unsupported / no permission — fall back to default */
      }
    },
    attachVideo() {
      const el = this.$refs.videoEl
      if (!el) return
      if (this.attachedVideo && this.attachedVideo !== this.tile.videoTrack) {
        try {
          this.attachedVideo.detach(el)
        } catch (_e) {
          /* noop */
        }
      }
      this.stopObservingTrackEnd()
      // Local screen share is never attached locally to avoid the mirror loop.
      if (this.tile.videoTrack && !this.showOwnScreenPlaceholder) {
        try {
          this.tile.videoTrack.attach(el)
          this.attachedVideo = this.tile.videoTrack
          this.observeTrackEnd()
        } catch (_e) {
          /* noop */
        }
      } else {
        this.attachedVideo = null
      }
    },
    observeTrackEnd() {
      // Stopping a screen share from the browser's own "Stop sharing" bar ends
      // the MediaStreamTrack right away, while the unpublish message needs
      // another round trip. In that window the <video> keeps painting its last
      // decoded frame — for a share that just ended, a black rectangle. Watch
      // the underlying track so the placeholder takes over immediately.
      const track = this.attachedVideo
      const mediaTrack = track && track.mediaStreamTrack
      if (!mediaTrack || typeof mediaTrack.addEventListener !== 'function') return
      if (mediaTrack.readyState === 'ended') {
        this.videoEnded = true
        return
      }
      this.onTrackEnded = () => {
        this.videoEnded = true
      }
      this.endedTrack = mediaTrack
      mediaTrack.addEventListener('ended', this.onTrackEnded)
    },
    stopObservingTrackEnd() {
      if (this.endedTrack && this.onTrackEnded) {
        try {
          this.endedTrack.removeEventListener('ended', this.onTrackEnded)
        } catch (_e) {
          /* noop */
        }
      }
      this.endedTrack = null
      this.onTrackEnded = null
    },
    attachAudio() {
      const el = this.$refs.audioEl
      if (!el) return
      if (this.attachedAudio && this.attachedAudio !== this.tile.audioTrack) {
        try {
          this.attachedAudio.detach(el)
        } catch (_e) {
          /* noop */
        }
      }
      if (this.tile.audioTrack) {
        try {
          this.tile.audioTrack.attach(el)
          this.attachedAudio = this.tile.audioTrack
          this.applySinkId()
        } catch (_e) {
          /* noop */
        }
      } else {
        this.attachedAudio = null
      }
    },
    detachAll() {
      this.stopObservingTrackEnd()
      const v = this.$refs.videoEl
      const a = this.$refs.audioEl
      if (this.attachedVideo && v) {
        try {
          this.attachedVideo.detach(v)
        } catch (_e) {
          /* noop */
        }
      }
      if (this.attachedAudio && a) {
        try {
          this.attachedAudio.detach(a)
        } catch (_e) {
          /* noop */
        }
      }
      this.attachedVideo = null
      this.attachedAudio = null
    },
  },
}
</script>

<style scoped>
.video-tile {
  position: relative;
  /*  Confine the speaking frame and the pin badge to this tile. Without an own */
  /*  stacking context their z-indexes compete with the call's overlays (the */
  /*  active-speaker chips), where a tie is decided by DOM order — and the tiles */
  /*  come last, so the frame would paint over the chips. */
  isolation: isolate;
  background: var(--color-neutral-0);
  overflow: hidden;
  display: flex;
  /*  Fill the flex/grid parent so a single tile occupies the full body in the */
  /*  minimized window. In a grid container, `flex` is ignored — width: 100% + */
  /*  height: 100% would not cascade reliably, so we use flex sizing here. */
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  border-radius: var(--border-radius-base);

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.video-tile--screen {
  background: var(--color-neutral-10);

  video {
    object-fit: contain;
  }
}

/*  Overlay sits above the video element (which has object-fit: cover and would */
/*  otherwise clip an inset box-shadow). Works for both the camera-on case and */
/*  the avatar fallback when the camera is off. */
.video-tile--speaking::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 3px solid var(--color-primary);
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
}

.video-tile--clickable {
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }
}

.video-tile__pin {
  position: absolute;
  top: var(--space-xxx-small);
  right: var(--space-xxx-small);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: var(--color-primary-inverse);
  border-radius: 50%;
  z-index: 3;
  pointer-events: none;

  svg {
    width: 14px;
    height: 14px;
  }
}

/*  Hidden tiles stay in the DOM so their <audio> element keeps playing the */
/*  participant's voice while the user is in the minimized view. */
.video-tile--hidden {
  display: none;
}

.video-tile__screen-tag {
  opacity: 0.85;
  margin-left: var(--space-xxx-small);
}

.video-tile__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-x-small);
  color: var(--text-color-inverse);
  pointer-events: none;
  padding: var(--space-small);

  /*  Don't let the flex column squish the avatar into an oval when the tile is */
  /*  narrower than the avatar's intrinsic size (thumbnail strip in spotlight). */
  > .avatar-image {
    flex-shrink: 0;
  }
}

.video-tile__fallback--own-screen {
  background: var(--color-neutral-10);
  color: var(--color-neutral-70);
}

.video-tile__fallback-icon {
  width: 48px;
  height: 48px;
  opacity: 0.7;
}

.video-tile__fallback-text {
  font-size: var(--font-size-small);
  opacity: 0.85;
}

.video-tile__starting {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-x-small);
  padding: var(--space-small);
  background: rgba(0, 0, 0, 0.55);
  color: var(--text-color-inverse);
  text-align: center;
  pointer-events: none;
  animation: video-tile-starting 150ms ease both;
}

.video-tile__starting-text {
  font-size: var(--font-size-small);
}

/*  Bottom right: the name sits bottom left, the pin badge top right. */
.video-tile__mic-starting {
  position: absolute;
  bottom: var(--space-xxx-small);
  right: var(--space-xxx-small);
  display: flex;
  align-items: center;
  gap: var(--space-xx-small);
  padding: 2px var(--space-x-small);
  border-radius: var(--border-radius-base);
  background: rgba(0, 0, 0, 0.6);
  color: var(--text-color-inverse);
  font-family: var(--font-family-text);
  font-size: var(--font-size-small);
  white-space: nowrap;
  pointer-events: none;
  animation: video-tile-starting 150ms ease both;
}

@keyframes video-tile-starting {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.video-tile__label {
  position: absolute;
  bottom: var(--space-xxx-small);
  left: var(--space-xxx-small);
  background: rgba(0, 0, 0, 0.6);
  color: var(--text-color-inverse);
  padding: 2px var(--space-x-small);
  border-radius: var(--border-radius-base);
  font-family: var(--font-family-text);
  font-size: var(--font-size-small);
  pointer-events: none;
}

.video-tile__local-tag {
  opacity: 0.75;
  margin-left: var(--space-xxx-small);
}

.video-tile__mic-status {
  width: 12px;
  height: 12px;
  margin-left: var(--space-xxx-small);
  vertical-align: middle;
}

.video-tile__mic-status--muted {
  color: var(--color-danger);
}

.video-tile__connection {
  display: inline-flex;
  color: var(--color-warning);
}

.video-tile__connection--lost {
  color: var(--color-danger);
}
</style>
