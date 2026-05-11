<template>
  <div
    :class="[
      'video-tile',
      {
        'video-tile--screen': tile.isScreen,
        'video-tile--speaking': isActiveSpeaker && !tile.isScreen,
      },
    ]"
  >
    <video
      v-show="hasVideo"
      ref="videoEl"
      autoplay
      playsinline
      :muted="tile.isLocal"
    />
    <audio
      v-if="!tile.isLocal"
      ref="audioEl"
      autoplay
    />
    <div
      v-if="showOwnScreenPlaceholder"
      class="video-tile__fallback video-tile__fallback--own-screen"
    >
      <os-icon :icon="icons.desktop" class="video-tile__fallback-icon" />
      <span class="video-tile__fallback-text">
        {{ $t('videoCall.youAreSharingScreen') }}
      </span>
    </div>
    <div v-else-if="!hasVideo && !tile.isScreen" class="video-tile__fallback">
      <profile-avatar :profile="tile.profile" size="large" />
      <span v-if="tile.isLocal" class="video-tile__fallback-text">
        {{ $t('videoCall.prejoin.cameraDisabled') }}
      </span>
    </div>
    <div class="video-tile__label">
      {{ tile.name }}
      <span v-if="tile.isLocal" class="video-tile__local-tag">
        ({{ $t('videoCall.you') }})
      </span>
      <span v-if="tile.isScreen" class="video-tile__screen-tag">
        — {{ $t('videoCall.screenShare') }}
      </span>
    </div>
  </div>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'

export default {
  name: 'VideoTile',
  components: { ProfileAvatar, OsIcon },
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
  },
  data() {
    return {
      attachedVideo: null,
      attachedAudio: null,
    }
  },
  created() {
    this.icons = iconRegistry
  },
  computed: {
    showOwnScreenPlaceholder() {
      // Rendering the local screen share back to the user creates an infinite
      // mirror (the tab being captured shows the captured tab…). Show a
      // static placeholder instead. Remote participants still see the actual
      // shared screen.
      return this.tile.isScreen && this.tile.isLocal
    },
    hasVideo() {
      if (this.showOwnScreenPlaceholder) return false
      return !!this.tile.videoTrack
    },
  },
  watch: {
    'tile.videoTrack': {
      immediate: true,
      handler() {
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
  mounted() {
    this.attachVideo()
    this.attachAudio()
  },
  beforeDestroy() {
    this.detachAll()
  },
  methods: {
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
      // Local screen share is never attached locally to avoid the mirror loop.
      if (this.tile.videoTrack && !this.showOwnScreenPlaceholder) {
        try {
          this.tile.videoTrack.attach(el)
          this.attachedVideo = this.tile.videoTrack
        } catch (_e) {
          /* noop */
        }
      } else {
        this.attachedVideo = null
      }
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

<style lang="scss" scoped>
.video-tile {
  position: relative;
  background: $color-neutral-0;
  overflow: hidden;
  display: flex;
  // Fill the flex/grid parent so a single tile occupies the full body in the
  // minimized window. In a grid container, `flex` is ignored — width: 100% +
  // height: 100% would not cascade reliably, so we use flex sizing here.
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  border-radius: $border-radius-base;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.video-tile--screen {
  background: $color-neutral-10;

  video {
    object-fit: contain;
  }
}

// Overlay sits above the video element (which has object-fit: cover and would
// otherwise clip an inset box-shadow). Works for both the camera-on case and
// the avatar fallback when the camera is off.
.video-tile--speaking::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 3px solid $color-primary;
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
}

// Hidden tiles stay in the DOM so their <audio> element keeps playing the
// participant's voice while the user is in the minimized view.
.video-tile--hidden {
  display: none;
}

.video-tile__screen-tag {
  opacity: 0.85;
  margin-left: $space-xxx-small;
}

.video-tile__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-x-small;
  color: $text-color-inverse;
  pointer-events: none;
  padding: $space-small;
}

.video-tile__fallback--own-screen {
  background: $color-neutral-10;
  color: $color-neutral-70;
}

.video-tile__fallback-icon {
  width: 48px;
  height: 48px;
  opacity: 0.7;
}

.video-tile__fallback-text {
  font-size: $font-size-small;
  opacity: 0.85;
}

.video-tile__label {
  position: absolute;
  bottom: $space-xxx-small;
  left: $space-xxx-small;
  background: rgba(0, 0, 0, 0.6);
  color: $text-color-inverse;
  padding: 2px $space-x-small;
  border-radius: $border-radius-base;
  font-family: $font-family-text;
  font-size: $font-size-small;
  pointer-events: none;
}

.video-tile__local-tag {
  opacity: 0.75;
  margin-left: $space-xxx-small;
}
</style>
