<template>
  <div
    v-if="show"
    :class="[
      'video-call',
      isFullscreen ? 'video-call--maximized' : 'video-call--minimized',
    ]"
    role="dialog"
    :aria-label="$t('videoCall.dialogLabel')"
  >
    <div class="video-call__header">
      <span v-if="!iconOnly" class="video-call__title">
        {{ $t('videoCall.title') }}
      </span>
      <span
        v-if="phase === 'in-call'"
        class="video-call__count"
        data-test="video-call-participants"
      >
        {{ tiles.length }}
      </span>
      <div class="video-call__header-actions">
        <os-button
          v-if="canMinimize && phase === 'in-call'"
          appearance="ghost"
          size="sm"
          circle
          :aria-label="minimized ? $t('videoCall.maximize') : $t('videoCall.minimize')"
          @click="toggleMinimize"
        >
          <template #icon>
            <os-icon :icon="minimized ? icons.expand : icons.minus" />
          </template>
        </os-button>
        <os-button
          variant="danger"
          appearance="ghost"
          size="sm"
          circle
          :aria-label="phase === 'in-call' ? $t('videoCall.leave') : $t('videoCall.prejoin.cancel')"
          @click="leave"
        >
          <template #icon>
            <os-icon :icon="icons.close" />
          </template>
        </os-button>
      </div>
    </div>

    <pre-join
      v-if="phase === 'prejoin'"
      @join="onPreJoinReady"
      @cancel="leave"
    />

    <div v-else-if="error" class="video-call__error" role="alert">
      {{ error }}
    </div>

    <div v-else class="video-call__body">
      <div v-if="phase === 'connecting'" class="video-call__status">
        {{ $t('videoCall.connecting') }}
      </div>
      <template v-else>
        <div
          v-if="isFullscreen"
          class="video-call__grid"
          :style="gridStyle"
        >
          <video-tile
            v-for="tile in tiles"
            :key="tile.key"
            :tile="tile"
            :sink-id="speakerDeviceId"
          />
        </div>
        <div v-else class="video-call__single">
          <video-tile
            v-if="primaryTile"
            :tile="primaryTile"
            :sink-id="speakerDeviceId"
          />
        </div>
      </template>
    </div>

    <div v-if="phase === 'in-call' && !error" class="video-call__controls">
      <button
        type="button"
        class="video-call__control"
        :aria-pressed="!micEnabled"
        :aria-label="micEnabled ? $t('videoCall.muteMic') : $t('videoCall.unmuteMic')"
        @click="toggleMic"
      >
        {{ micEnabled ? $t('videoCall.muteMic') : $t('videoCall.unmuteMic') }}
      </button>
      <button
        type="button"
        class="video-call__control"
        :aria-pressed="!cameraEnabled"
        :aria-label="cameraEnabled ? $t('videoCall.disableCamera') : $t('videoCall.enableCamera')"
        @click="toggleCamera"
      >
        {{ cameraEnabled ? $t('videoCall.disableCamera') : $t('videoCall.enableCamera') }}
      </button>
      <button
        v-if="screenShareSupported"
        type="button"
        class="video-call__control"
        :aria-pressed="screenShareEnabled"
        :aria-label="screenShareEnabled ? $t('videoCall.stopScreenShare') : $t('videoCall.startScreenShare')"
        @click="toggleScreenShare"
      >
        {{ screenShareEnabled ? $t('videoCall.stopScreenShare') : $t('videoCall.startScreenShare') }}
      </button>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import mobile from '~/mixins/mobile'
import { joinGroupVideoCallMutation } from '~/graphql/VideoCalls'
import VideoTile from './VideoTile.vue'
import PreJoin from './PreJoin.vue'

export default {
  name: 'VideoCall',
  components: { VideoTile, PreJoin },
  mixins: [mobile()],
  data() {
    return {
      phase: 'prejoin', // prejoin | connecting | in-call
      room: null,
      tiles: [],
      micEnabled: true,
      cameraEnabled: true,
      screenShareEnabled: false,
      error: null,
      cameraDeviceId: null,
      micDeviceId: null,
      speakerDeviceId: null,
      Track: null,
    }
  },
  computed: {
    ...mapGetters({
      show: 'videoCall/showVideoCall',
      minimized: 'videoCall/minimized',
      groupId: 'videoCall/groupId',
    }),
    canMinimize() {
      return !this.isMobile
    },
    isFullscreen() {
      return this.isMobile || !this.minimized || this.phase !== 'in-call'
    },
    screenShareSupported() {
      return (
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getDisplayMedia === 'function'
      )
    },
    primaryTile() {
      if (this.tiles.length === 0) return null
      const screen = this.tiles.find((t) => t.isScreen && !t.isLocal)
      if (screen) return screen
      const remoteCam = this.tiles.find((t) => !t.isLocal && !t.isScreen)
      return remoteCam || this.tiles[0]
    },
    gridStyle() {
      const n = Math.max(1, this.tiles.length)
      const cols = Math.ceil(Math.sqrt(n))
      return { 'grid-template-columns': `repeat(${cols}, 1fr)` }
    },
  },
  watch: {
    show: {
      immediate: true,
      handler(open) {
        if (open) {
          this.phase = 'prejoin'
          this.error = null
        } else {
          this.cleanup()
        }
      },
    },
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    ...mapMutations({
      setMinimized: 'videoCall/SET_MINIMIZED',
      close: 'videoCall/CLOSE',
      setParticipantCount: 'videoCall/SET_PARTICIPANT_COUNT',
    }),
    toggleMinimize() {
      this.setMinimized(!this.minimized)
    },
    async onPreJoinReady(payload) {
      this.cameraDeviceId = payload.cameraDeviceId
      this.micDeviceId = payload.micDeviceId
      this.speakerDeviceId = payload.speakerDeviceId
      this.micEnabled = payload.micEnabled
      this.cameraEnabled = payload.cameraEnabled
      await this.connect()
    },
    async connect() {
      this.phase = 'connecting'
      this.error = null
      this.tiles = []
      try {
        if (!this.groupId) throw new Error('Missing group id')
        const { data } = await this.$apollo.mutate({
          mutation: joinGroupVideoCallMutation(),
          variables: { groupId: this.groupId },
        })
        const payload = data && data.joinGroupVideoCall
        if (!payload) throw new Error('No token returned')

        const livekit = await import('livekit-client')
        const { Room, RoomEvent, Track } = livekit
        this.Track = Track

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: this.cameraDeviceId ? { deviceId: this.cameraDeviceId } : {},
          audioCaptureDefaults: this.micDeviceId ? { deviceId: this.micDeviceId } : {},
        })
        this.room = room

        const onAny = () => this.refreshTiles()
        room.on(RoomEvent.ParticipantConnected, onAny)
        room.on(RoomEvent.ParticipantDisconnected, onAny)
        room.on(RoomEvent.TrackSubscribed, onAny)
        room.on(RoomEvent.TrackUnsubscribed, onAny)
        room.on(RoomEvent.LocalTrackPublished, () => {
          this.screenShareEnabled = !!room.localParticipant.isScreenShareEnabled
          onAny()
        })
        room.on(RoomEvent.LocalTrackUnpublished, () => {
          this.screenShareEnabled = !!room.localParticipant.isScreenShareEnabled
          onAny()
        })
        room.on(RoomEvent.Disconnected, () => this.close())

        await room.connect(payload.url, payload.token)
        if (this.micEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true)
        }
        if (this.cameraEnabled) {
          await room.localParticipant.setCameraEnabled(true)
        }
        this.refreshTiles()
        this.phase = 'in-call'
      } catch (err) {
        this.error = (err && err.message) || String(err)
        this.phase = 'in-call'
      }
    },
    refreshTiles() {
      const room = this.room
      const Track = this.Track
      if (!room) return
      const tiles = []
      const collectAudio = (participant) => {
        for (const pub of participant.audioTrackPublications.values()) {
          if (!Track || pub.source === Track.Source.Microphone) return pub.track || null
        }
        return null
      }
      const collect = (participant, isLocal) => {
        const audioTrack = collectAudio(participant)
        const videoPubs = Array.from(participant.videoTrackPublications.values())
        if (videoPubs.length === 0) {
          tiles.push({
            key: `${participant.identity}/audio`,
            identity: participant.identity,
            name: participant.name || participant.identity,
            videoTrack: null,
            audioTrack,
            isLocal,
            isScreen: false,
          })
          return
        }
        for (const pub of videoPubs) {
          const isScreen = Track ? pub.source === Track.Source.ScreenShare : false
          tiles.push({
            key: `${participant.identity}/${isScreen ? 'screen' : 'cam'}`,
            identity: participant.identity,
            name: participant.name || participant.identity,
            videoTrack: pub.track || null,
            audioTrack: isScreen ? null : audioTrack,
            isLocal,
            isScreen,
          })
        }
      }
      collect(room.localParticipant, true)
      for (const p of room.remoteParticipants.values()) collect(p, false)
      this.tiles = tiles
      this.setParticipantCount(
        new Set(tiles.map((t) => t.identity)).size,
      )
    },
    async toggleMic() {
      if (!this.room) return
      const next = !this.micEnabled
      await this.room.localParticipant.setMicrophoneEnabled(next)
      this.micEnabled = next
    },
    async toggleCamera() {
      if (!this.room) return
      const next = !this.cameraEnabled
      await this.room.localParticipant.setCameraEnabled(next)
      this.cameraEnabled = next
      this.refreshTiles()
    },
    async toggleScreenShare() {
      if (!this.room || !this.screenShareSupported) return
      try {
        const next = !this.screenShareEnabled
        await this.room.localParticipant.setScreenShareEnabled(next, { audio: true })
        this.screenShareEnabled = next
        this.refreshTiles()
      } catch (err) {
        // User cancelled the browser picker or screen capture failed — leave state untouched.
        if (err && err.name !== 'NotAllowedError') {
          this.error = err.message || String(err)
        }
      }
    },
    async leave() {
      await this.cleanup()
      this.close()
    },
    async cleanup() {
      if (this.room) {
        try {
          await this.room.disconnect()
        } catch (_e) {
          /* ignore */
        }
        this.room = null
      }
      this.tiles = []
      this.micEnabled = true
      this.cameraEnabled = true
      this.screenShareEnabled = false
      this.phase = 'prejoin'
    },
  },
}
</script>

<style lang="scss" scoped>
.video-call {
  position: fixed;
  background: $background-color-base;
  color: $text-color-base;
  display: flex;
  flex-direction: column;
  z-index: $z-index-overlay;
  box-shadow: $box-shadow-large;
  font-family: $font-family-text;
}

.video-call--maximized {
  inset: 0;
  z-index: $z-index-overlay + 1;
}

.video-call--minimized {
  bottom: 0;
  right: 0;
  width: 355px;
  height: 280px;
  border-top-left-radius: $border-radius-base;
  border-top-right-radius: $border-radius-base;
  overflow: hidden;
}

.video-call__header {
  display: flex;
  align-items: center;
  gap: $space-x-small;
  padding: $space-x-small $space-small;
  background: $color-header-background;
  border-bottom: 1px solid $color-neutral-85;
  font-weight: $font-weight-bold;
  color: $text-color-base;
}

.video-call__title {
  flex: 1;
}

.video-call__count {
  background: $color-primary;
  color: $color-primary-inverse;
  padding: 2px $space-x-small;
  border-radius: $border-radius-rounded;
  font-size: $font-size-small;
  min-width: 28px;
  text-align: center;
}

.video-call__header-actions {
  display: flex;
  gap: $space-xxx-small;
}

.video-call__icon-btn {
  background: transparent;
  border: none;
  color: $text-color-soft;
  cursor: pointer;
  font-size: 1.2em;
  padding: $space-xxx-small $space-x-small;
  border-radius: $border-radius-base;
  line-height: 1;

  &:hover {
    background: $background-color-softer;
    color: $text-color-base;
  }
}

.video-call__icon-btn--danger {
  &:hover {
    background: $color-danger;
    color: $color-danger-inverse;
  }
}

.video-call__body {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: $color-neutral-10;
  position: relative;
}

.video-call__grid {
  flex: 1;
  display: grid;
  gap: $space-xxx-small;
  padding: $space-xxx-small;
  width: 100%;
  height: 100%;
}

.video-call__single {
  flex: 1;
  display: flex;
}

.video-call__status,
.video-call__error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-small;
  text-align: center;
  color: $text-color-inverse;
}

.video-call__error {
  color: $color-danger-inverse;
  background: $color-danger;
}

.video-call__controls {
  display: flex;
  gap: $space-x-small;
  padding: $space-x-small $space-small;
  background: $background-color-soft;
  border-top: 1px solid $color-neutral-85;
  flex-wrap: wrap;
}

.video-call__control {
  background: $background-color-base;
  color: $text-color-base;
  border: 1px solid $color-neutral-70;
  padding: $space-xx-small $space-small;
  border-radius: $border-radius-base;
  font-family: $font-family-text;
  font-size: $font-size-small;
  cursor: pointer;
  transition: background-color $duration-short ease;

  &:hover {
    background: $background-color-softer;
  }

  &[aria-pressed='true'] {
    background: $color-danger;
    border-color: $color-danger;
    color: $color-danger-inverse;

    &:hover {
      background: $color-danger-active;
    }
  }
}

@media (max-width: 810px) {
  .video-call--minimized {
    inset: 0;
    width: auto;
    height: auto;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }
}
</style>
