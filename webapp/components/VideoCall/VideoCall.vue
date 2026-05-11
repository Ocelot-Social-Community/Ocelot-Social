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
      <nuxt-link
        v-if="!iconOnly && groupRoute"
        :to="groupRoute"
        class="video-call__title video-call__title--link"
        :aria-label="$t('videoCall.gotoGroup', { name: titleLabel })"
        @click.native="onGroupLinkClick"
      >
        {{ titleLabel }}
      </nuxt-link>
      <span v-else-if="!iconOnly" class="video-call__title">
        {{ titleLabel }}
      </span>
      <span
        v-if="phase === 'in-call'"
        class="video-call__count"
        data-test="video-call-participants"
      >
        {{ uniqueParticipantCount }}
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
      <div
        v-else
        :class="['video-call__stage', isFullscreen ? 'video-call__grid' : 'video-call__single']"
        :style="isFullscreen ? gridStyle : null"
      >
        <!--
          All tiles are always mounted so every participant's audio track stays
          attached to a DOM <audio> element. In the minimized view, only the
          primary tile is visible; the rest are hidden via CSS while their
          audio keeps playing.
        -->
        <video-tile
          v-for="tile in tiles"
          :key="tile.key"
          :tile="tile"
          :sink-id="speakerDeviceId"
          :class="{
            'video-tile--hidden':
              !isFullscreen && primaryTile && tile.key !== primaryTile.key,
          }"
        />
      </div>
    </div>

    <div v-if="phase === 'in-call' && !error" class="video-call__controls">
      <os-button
        :variant="micEnabled ? 'default' : 'danger'"
        appearance="outline"
        :size="iconOnly ? 'sm' : 'md'"
        :circle="iconOnly"
        :aria-label="micEnabled ? $t('videoCall.muteMic') : $t('videoCall.unmuteMic')"
        @click="toggleMic"
      >
        <template #icon>
          <os-icon :icon="micEnabled ? icons.microphone : icons.microphoneSlash" />
        </template>
        <template v-if="!iconOnly">
          {{ micEnabled ? $t('videoCall.muteMic') : $t('videoCall.unmuteMic') }}
        </template>
      </os-button>
      <os-button
        :variant="cameraEnabled ? 'default' : 'danger'"
        appearance="outline"
        :size="iconOnly ? 'sm' : 'md'"
        :circle="iconOnly"
        :aria-label="cameraEnabled ? $t('videoCall.disableCamera') : $t('videoCall.enableCamera')"
        @click="toggleCamera"
      >
        <template #icon>
          <os-icon :icon="icons.videoCamera" />
        </template>
        <template v-if="!iconOnly">
          {{ cameraEnabled ? $t('videoCall.disableCamera') : $t('videoCall.enableCamera') }}
        </template>
      </os-button>
      <os-button
        v-if="screenShareSupported"
        :variant="screenShareEnabled ? 'primary' : 'default'"
        appearance="outline"
        :size="iconOnly ? 'sm' : 'md'"
        :circle="iconOnly"
        :aria-label="screenShareEnabled ? $t('videoCall.stopScreenShare') : $t('videoCall.startScreenShare')"
        @click="toggleScreenShare"
      >
        <template #icon>
          <os-icon :icon="icons.desktop" />
        </template>
        <template v-if="!iconOnly">
          {{ screenShareEnabled ? $t('videoCall.stopScreenShare') : $t('videoCall.startScreenShare') }}
        </template>
      </os-button>
      <os-button
        v-if="!isMobile"
        :variant="chatOpenForThisGroup ? 'primary' : 'default'"
        appearance="outline"
        :size="iconOnly ? 'sm' : 'md'"
        :circle="iconOnly"
        :aria-label="chatOpenForThisGroup ? $t('videoCall.closeChat') : $t('videoCall.openChat')"
        @click="toggleChat"
      >
        <template #icon>
          <os-icon :icon="icons.chatBubble" />
        </template>
        <template v-if="!iconOnly">
          {{ chatOpenForThisGroup ? $t('videoCall.closeChat') : $t('videoCall.openChat') }}
        </template>
      </os-button>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import mobile from '~/mixins/mobile'
import { joinGroupVideoCallMutation } from '~/graphql/VideoCalls'
import VideoTile from './VideoTile.vue'
import PreJoin from './PreJoin.vue'

export default {
  name: 'VideoCall',
  components: { VideoTile, PreJoin, OsButton, OsIcon },
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
      groupName: 'videoCall/groupName',
      groupSlug: 'videoCall/groupSlug',
      getShowChat: 'chat/showChat',
    }),
    chatOpenForThisGroup() {
      return !!(
        this.getShowChat &&
        this.getShowChat.showChat &&
        this.getShowChat.groupId === this.groupId
      )
    },
    titleLabel() {
      return this.groupName || this.$t('videoCall.title')
    },
    groupRoute() {
      if (!this.groupId || !this.groupSlug) return null
      return { name: 'groups-id-slug', params: { id: this.groupId, slug: this.groupSlug } }
    },
    canMinimize() {
      return !this.isMobile
    },
    isFullscreen() {
      return this.isMobile || !this.minimized || this.phase !== 'in-call'
    },
    iconOnly() {
      // Compact icon-only buttons when the call is parked in the corner.
      return !this.isFullscreen
    },
    uniqueParticipantCount() {
      // A single participant publishing both camera and screen share still counts
      // as one — count distinct identities, not tiles.
      return new Set(this.tiles.map((t) => t.identity)).size
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
      // Active screen-share takes priority (own or remote) — that's the most
      // important content to surface in the minimized window.
      const anyScreen = this.tiles.find((t) => t.isScreen && t.videoTrack)
      if (anyScreen) return anyScreen
      // Then prefer a remote camera with an active video track.
      const remoteCamWithVideo = this.tiles.find(
        (t) => !t.isLocal && !t.isScreen && t.videoTrack,
      )
      if (remoteCamWithVideo) return remoteCamWithVideo
      const anyRemote = this.tiles.find((t) => !t.isLocal)
      return anyRemote || this.tiles[0]
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
  created() {
    this.icons = iconRegistry
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    ...mapMutations({
      setMinimized: 'videoCall/SET_MINIMIZED',
      close: 'videoCall/CLOSE',
      setParticipantCount: 'videoCall/SET_PARTICIPANT_COUNT',
      setShowChat: 'chat/SET_OPEN_CHAT',
    }),
    toggleChat() {
      if (this.chatOpenForThisGroup) {
        this.setShowChat({ showChat: false, chatUserId: null, groupId: null })
        return
      }
      this.setShowChat({ showChat: true, chatUserId: null, groupId: this.groupId })
      // The chat-modul lives in default.vue and only fits when the video isn't
      // covering the screen. Park the call in the corner so both are visible.
      if (!this.minimized) this.setMinimized(true)
    },
    toggleMinimize() {
      this.setMinimized(!this.minimized)
    },
    onGroupLinkClick() {
      // Navigating happens via nuxt-link; minimize so the user can interact
      // with the destination page while the call keeps running in the corner.
      if (!this.isMobile && !this.minimized) {
        this.setMinimized(true)
      }
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
    showDeviceErrorToast(kind, err) {
      const name = err && err.name
      let key
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        key = 'denied'
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        key = 'noDevice'
      } else if (name === 'NotReadableError') {
        key = 'busy'
      } else {
        key = 'generic'
      }
      const message = this.$t(`videoCall.errors.${kind}.${key}`)
      if (this.$toast && typeof this.$toast.error === 'function') {
        this.$toast.error(message)
      }
    },
    async toggleMic() {
      if (!this.room) return
      const next = !this.micEnabled
      try {
        await this.room.localParticipant.setMicrophoneEnabled(next)
        this.micEnabled = next
      } catch (err) {
        this.showDeviceErrorToast('mic', err)
      }
    },
    async toggleCamera() {
      if (!this.room) return
      const next = !this.cameraEnabled
      try {
        await this.room.localParticipant.setCameraEnabled(next)
        this.cameraEnabled = next
        this.refreshTiles()
      } catch (err) {
        this.showDeviceErrorToast('camera', err)
      }
    },
    async toggleScreenShare() {
      if (!this.room || !this.screenShareSupported) return
      const next = !this.screenShareEnabled
      try {
        await this.room.localParticipant.setScreenShareEnabled(next, { audio: true })
        this.screenShareEnabled = next
        this.refreshTiles()
      } catch (err) {
        // NotAllowedError on screen-share usually means the user dismissed the
        // OS picker — that's not worth a toast. Surface anything else.
        if (err && err.name !== 'NotAllowedError') {
          this.showDeviceErrorToast('screen', err)
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
  // Match the chat's footer offset so the minimized window sits above the
  // desktop footer instead of flush with the viewport edge.
  bottom: 45px;
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-call__title--link {
  color: $text-color-link;
  text-decoration: none;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    color: $text-color-link-active;
  }
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
  align-items: center;
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
  justify-content: center;
}

.video-call--minimized .video-call__controls {
  // Tighter spacing for the icon-only row in the parked window.
  padding: $space-xxx-small $space-x-small;
  gap: $space-xxx-small;
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
