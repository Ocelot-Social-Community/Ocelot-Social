<template>
  <div :class="['video-tile', { 'video-tile--screen': tile.isScreen }]">
    <video
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
export default {
  name: 'VideoTile',
  props: {
    tile: {
      type: Object,
      required: true,
    },
    sinkId: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      attachedVideo: null,
      attachedAudio: null,
    }
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
      if (this.tile.videoTrack) {
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

.video-tile__screen-tag {
  opacity: 0.85;
  margin-left: $space-xxx-small;
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
