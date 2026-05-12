<template>
  <div v-if="show" class="video-call-root">
    <div v-if="isPreJoinModal" class="video-call__backdrop" @click="leave" />
    <div
      :class="['video-call', modeClass]"
      role="dialog"
      :aria-modal="isPreJoinModal ? 'true' : null"
      :aria-label="$t('videoCall.dialogLabel')"
      @click.stop
    >
      <div class="video-call__header">
        <div class="video-call__header-info">
          <profile-avatar :profile="groupProfile" class="video-call__avatar" />
          <room-title-link
            :name="titleLabel"
            :to="groupRoute"
            :show-group-icon="!!groupId"
            :aria-label="$t('videoCall.gotoGroup', { name: titleLabel })"
            @click="onGroupLinkClick"
          />
        </div>
        <div class="video-call__header-right">
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
              variant="primary"
              appearance="outline"
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
              variant="primary"
              appearance="outline"
              size="sm"
              circle
              :aria-label="
                phase === 'in-call' ? $t('videoCall.leave') : $t('videoCall.prejoin.cancel')
              "
              @click="leave"
            >
              <template #icon>
                <os-icon :icon="icons.close" />
              </template>
            </os-button>
          </div>
        </div>
      </div>

      <pre-join v-if="phase === 'prejoin'" @join="onPreJoinReady" @cancel="leave" />

      <div v-else-if="error" class="video-call__error" role="alert">
        {{ error }}
      </div>

      <div v-else class="video-call__body">
        <div v-if="phase === 'connecting'" class="video-call__status">
          {{ $t('videoCall.connecting') }}
        </div>
        <template v-else>
          <div
            v-if="isFullscreen && activeSpeakers.length"
            class="video-call__speakers"
            :aria-label="$t('videoCall.activeSpeakers')"
          >
            <span
              v-for="speaker in activeSpeakers"
              :key="speaker.identity"
              class="video-call__speaker-chip"
            >
              {{ speaker.name }}
              <span v-if="speaker.isLocal" class="video-call__speaker-chip-self">
                ({{ $t('videoCall.you') }})
              </span>
            </span>
          </div>
          <div :class="['video-call__stage', stageLayoutClass]" :style="gridStyleConditional">
            <!--
            All tiles are always mounted so every participant's audio track stays
            attached to a DOM <audio> element. CSS Grid (in spotlight mode)
            places the spotlight tile into the wide left cell and lets the
            others auto-flow into a narrow right column — instances stay stable
            on toggle so audio doesn't re-attach.
          -->
            <video-tile
              v-for="tile in tiles"
              :key="tile.key"
              :tile="tile"
              :sink-id="speakerDeviceId"
              :is-active-speaker="activeSpeakerSet.has(tile.identity)"
              :is-spotlighted="!!(spotlightTile && tile.key === spotlightTile.key)"
              :avatar-size="tileAvatarSize(tile)"
              :clickable="isFullscreen"
              :class="{
                'video-tile--hidden': !isFullscreen && primaryTile && tile.key !== primaryTile.key,
                'video-tile--spotlighted': !!(spotlightTile && tile.key === spotlightTile.key),
              }"
              @select="onTileSelect"
            />
          </div>
          <aside
            v-if="showChatSidebar"
            class="video-call__sidebar"
            :aria-label="$t('videoCall.openChat')"
          >
            <client-only>
              <chat singleRoom fitParent :groupId="groupId" @close-single-room="closeInCallChat" />
            </client-only>
          </aside>
        </template>
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
          :aria-label="
            screenShareEnabled ? $t('videoCall.stopScreenShare') : $t('videoCall.startScreenShare')
          "
          @click="toggleScreenShare"
        >
          <template #icon>
            <os-icon :icon="icons.desktop" />
          </template>
          <template v-if="!iconOnly">
            {{
              screenShareEnabled
                ? $t('videoCall.stopScreenShare')
                : $t('videoCall.startScreenShare')
            }}
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
        <os-button
          variant="danger"
          appearance="filled"
          :size="iconOnly ? 'sm' : 'md'"
          :circle="iconOnly"
          class="video-call__leave"
          :aria-label="$t('videoCall.leave')"
          @click="leave"
        >
          <template #icon>
            <os-icon :icon="icons.phone" />
          </template>
          <template v-if="!iconOnly">
            {{ $t('videoCall.leave') }}
          </template>
        </os-button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import mobile from '~/mixins/mobile'
import { joinGroupVideoCallMutation } from '~/graphql/VideoCalls'
import Chat from '~/components/Chat/Chat.vue'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import RoomTitleLink from '~/components/_new/generic/RoomTitleLink/RoomTitleLink'
import VideoTile from './VideoTile.vue'
import PreJoin from './PreJoin.vue'

export default {
  name: 'VideoCall',
  components: {
    VideoTile,
    PreJoin,
    OsButton,
    OsIcon,
    Chat,
    ProfileAvatar,
    RoomTitleLink,
  },
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
      activeSpeakerIds: [],
      spotlightKey: null,
    }
  },
  computed: {
    ...mapGetters({
      show: 'videoCall/showVideoCall',
      minimized: 'videoCall/minimized',
      groupId: 'videoCall/groupId',
      groupName: 'videoCall/groupName',
      groupSlug: 'videoCall/groupSlug',
      groupAvatar: 'videoCall/groupAvatar',
      getShowChat: 'chat/showChat',
      currentUser: 'auth/user',
    }),
    groupProfile() {
      return {
        id: this.groupId,
        name: this.groupName || this.groupSlug || '',
        avatar: this.groupAvatar,
      }
    },
    chatOpenForThisGroup() {
      return !!(
        this.getShowChat &&
        this.getShowChat.showChat &&
        this.getShowChat.groupId === this.groupId
      )
    },
    showChatSidebar() {
      // Embedded in the maximized call view. In the minimized/parked state the
      // chat continues to live in the chat-modul (layouts/default.vue).
      return (
        this.phase === 'in-call' && this.chatOpenForThisGroup && !this.iconOnly && !this.isMobile
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
    isPreJoinModal() {
      return this.phase === 'prejoin'
    },
    isFullscreen() {
      // During prejoin we render as a centered modal — not full screen.
      if (this.isPreJoinModal) return false
      return this.isMobile || !this.minimized || this.phase !== 'in-call'
    },
    modeClass() {
      if (this.isPreJoinModal) return 'video-call--modal'
      return this.isFullscreen ? 'video-call--maximized' : 'video-call--minimized'
    },
    onCallRoute() {
      return this.$route.name === 'call-id-slug'
    },
    iconOnly() {
      // Compact icon-only buttons only when the call is parked in the corner
      // during an active call — not during the prejoin modal.
      return this.phase === 'in-call' && this.minimized && !this.isMobile
    },
    uniqueParticipantCount() {
      // A single participant publishing both camera and screen share still counts
      // as one — count distinct identities, not tiles.
      return new Set(this.tiles.map((t) => t.identity)).size
    },
    activeSpeakers() {
      // Deduplicate identities and resolve display names from the tile list.
      const seen = new Set()
      const out = []
      for (const id of this.activeSpeakerIds) {
        if (seen.has(id)) continue
        seen.add(id)
        const tile = this.tiles.find((t) => t.identity === id)
        if (!tile) continue
        out.push({ identity: id, name: tile.name, isLocal: tile.isLocal })
      }
      return out
    },
    activeSpeakerSet() {
      return new Set(this.activeSpeakerIds)
    },
    spotlightTile() {
      if (!this.spotlightKey) return null
      return this.tiles.find((t) => t.key === this.spotlightKey) || null
    },
    stageLayoutClass() {
      if (this.spotlightTile && this.isFullscreen) return 'video-call__stage--spotlight'
      return this.isFullscreen ? 'video-call__grid' : 'video-call__single'
    },
    gridStyleConditional() {
      // The grid template only applies for the regular grid view. Spotlight
      // and single (minimized) modes have their own static layouts.
      if (this.spotlightTile || !this.isFullscreen) return null
      return this.gridStyle
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
      const remoteCamWithVideo = this.tiles.find((t) => !t.isLocal && !t.isScreen && t.videoTrack)
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
    phase: {
      immediate: true,
      handler(next) {
        // Sync to the store so layouts (chat-modul vs sidebar) can switch in
        // the same reactive tick as the local phase change.
        this.setStorePhase(next || 'idle')
      },
    },
    tiles(newTiles) {
      // Clear the spotlight if the pinned tile no longer exists (participant
      // left, camera toggled and the key changed from cam→audio etc.).
      if (this.spotlightKey && !newTiles.some((t) => t.key === this.spotlightKey)) {
        this.spotlightKey = null
      }
    },
    $route(to) {
      // Keep the minimized/maximized state in sync with the URL when the user
      // navigates via links, browser back/forward, or our own routing helpers.
      if (!this.show) return
      if (this.phase !== 'connecting' && this.phase !== 'in-call') return
      const onCall = to.name === 'call-id-slug'
      if (onCall && this.minimized) this.setMinimized(false)
      else if (!onCall && !this.minimized) this.setMinimized(true)
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
      setStorePhase: 'videoCall/SET_PHASE',
      setShowChat: 'chat/SET_OPEN_CHAT',
    }),
    toggleChat() {
      if (this.chatOpenForThisGroup) {
        this.setShowChat({ showChat: false, chatUserId: null, groupId: null })
        return
      }
      this.setShowChat({ showChat: true, chatUserId: null, groupId: this.groupId })
      // Chat renders inside the call sidebar when maximized, or in the
      // chat-modul (layouts/default.vue) when the call is parked. Either
      // way no navigation is needed.
    },
    closeInCallChat() {
      this.setShowChat({ showChat: false, chatUserId: null, groupId: null })
    },
    tileAvatarSize(tile) {
      // Spotlight thumbnails are too short for the large avatar — it gets
      // visually squished into an oval. Use the small avatar there instead.
      if (this.spotlightTile && tile.key !== this.spotlightTile.key) return 'small'
      return 'large'
    },
    onTileSelect(tile) {
      if (!tile) return
      // Only spotlight in fullscreen — minimized window already shows one tile.
      if (!this.isFullscreen) return
      this.spotlightKey = this.spotlightKey === tile.key ? null : tile.key
    },
    toggleMinimize() {
      const next = !this.minimized
      this.setMinimized(next)
      // URL follows the visual state: maximized → /call/..., minimized → /groups/...
      const targetRoute = next ? 'groups-id-slug' : 'call-id-slug'
      if (this.groupId && this.groupSlug && this.$route.name !== targetRoute) {
        this.$router
          .push({
            name: targetRoute,
            params: { id: this.groupId, slug: this.groupSlug },
          })
          .catch(() => {
            /* ignore navigation duplicates / aborts */
          })
      }
    },
    onGroupLinkClick() {
      // The nuxt-link navigates; the route watcher above will minimize the
      // call automatically. Nothing else to do here.
    },
    async onPreJoinReady(payload) {
      this.cameraDeviceId = payload.cameraDeviceId
      this.micDeviceId = payload.micDeviceId
      this.speakerDeviceId = payload.speakerDeviceId
      this.micEnabled = payload.micEnabled
      this.cameraEnabled = payload.cameraEnabled
      // Close the modal synchronously *before* triggering navigation so the
      // popup actually disappears on the first click. If we let connect() set
      // phase='connecting' instead, the route transition that runs in parallel
      // can clobber the reactivity update and the modal stays visible.
      this.phase = 'connecting'
      this.error = null
      this.tiles = []
      // Take the user to the call's own URL — the page exists so the in-call
      // view is bookmarkable / shareable / browser-back aware. Await the push
      // so the URL change finishes before we start the LiveKit handshake.
      if (this.groupId && this.groupSlug && this.$route.name !== 'call-id-slug') {
        try {
          await this.$router.push({
            name: 'call-id-slug',
            params: { id: this.groupId, slug: this.groupSlug },
          })
        } catch (_e) {
          /* navigation duplicates / aborts — fine */
        }
      }
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
        // LiveKit's setCameraEnabled(false) mutes the track instead of
        // unpublishing it. Re-render so the avatar fallback kicks in.
        room.on(RoomEvent.TrackMuted, onAny)
        room.on(RoomEvent.TrackUnmuted, onAny)
        // Token metadata carries the avatar URL — re-render tiles when it
        // changes so the avatar updates without a reconnect.
        room.on(RoomEvent.ParticipantMetadataChanged, onAny)
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          this.activeSpeakerIds = (speakers || []).map((p) => p.identity)
        })
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
      const profileFor = (participant, isLocal) => {
        if (isLocal && this.currentUser) {
          return {
            id: this.currentUser.id,
            name: this.currentUser.name,
            avatar: this.currentUser.avatar,
          }
        }
        // Remote: read the token metadata that the backend put on the
        // participant so we can render the real avatar instead of initials.
        let meta = null
        if (participant.metadata) {
          try {
            meta = JSON.parse(participant.metadata)
          } catch (_e) {
            /* ignore malformed metadata */
          }
        }
        const avatarUrl = meta && meta.avatarUrl
        return {
          id: (meta && meta.userId) || participant.identity,
          name: participant.name || participant.identity,
          // ResponsiveImage (used by ProfileAvatar) expects url + responsive
          // variants. We only have one URL from the metadata — reuse it for
          // every variant so the srcset stays valid; the browser will load
          // the available image regardless of the requested size.
          avatar: avatarUrl
            ? { url: avatarUrl, w320: avatarUrl, w640: avatarUrl, w1024: avatarUrl }
            : null,
        }
      }
      const findVideoPub = (participant, source) => {
        for (const pub of participant.videoTrackPublications.values()) {
          if (Track && pub.source === source && pub.track) return pub
        }
        return null
      }
      const collect = (participant, isLocal) => {
        const audioTrack = collectAudio(participant)
        const profile = profileFor(participant, isLocal)
        // Use the participant-level getters (isCameraEnabled / isScreenShareEnabled)
        // as the source of truth — they reflect mute AND publication state more
        // reliably than iterating the publication map (where mute flags can lag
        // behind the high-level toggle by a tick on some livekit-client versions).
        const cameraPub =
          Track && participant.isCameraEnabled
            ? findVideoPub(participant, Track.Source.Camera)
            : null
        const screenPub =
          Track && participant.isScreenShareEnabled
            ? findVideoPub(participant, Track.Source.ScreenShare)
            : null
        if (!cameraPub && !screenPub) {
          // No active video — always render an audio-only tile so the avatar
          // fallback shows, even when the user is alone in the room with
          // camera and mic both turned off.
          tiles.push({
            key: `${participant.identity}/audio`,
            identity: participant.identity,
            name: participant.name || participant.identity,
            profile,
            videoTrack: null,
            audioTrack,
            isLocal,
            isScreen: false,
          })
          return
        }
        if (cameraPub) {
          tiles.push({
            key: `${participant.identity}/cam`,
            identity: participant.identity,
            name: participant.name || participant.identity,
            profile,
            videoTrack: cameraPub.track,
            audioTrack,
            isLocal,
            isScreen: false,
          })
        }
        if (screenPub) {
          tiles.push({
            key: `${participant.identity}/screen`,
            identity: participant.identity,
            name: participant.name || participant.identity,
            profile,
            videoTrack: screenPub.track,
            audioTrack: null,
            isLocal,
            isScreen: true,
          })
        }
      }
      collect(room.localParticipant, true)
      for (const p of room.remoteParticipants.values()) collect(p, false)
      this.tiles = tiles
      this.setParticipantCount(new Set(tiles.map((t) => t.identity)).size)
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
      // Capture before close() clears the store.
      const groupId = this.groupId
      const groupSlug = this.groupSlug
      // Navigate away from the call URL *before* clearing the store, otherwise
      // the call page's watcher sees showVideoCall flip to false while it's
      // still mounted and re-opens the prejoin popover for the same group.
      if (this.$route.name === 'call-id-slug' && groupId && groupSlug) {
        try {
          await this.$router.replace({
            name: 'groups-id-slug',
            params: { id: groupId, slug: groupSlug },
          })
        } catch (_e) {
          /* ignore navigation duplicates / aborts */
        }
      }
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
      this.activeSpeakerIds = []
      this.spotlightKey = null
      this.micEnabled = true
      this.cameraEnabled = true
      this.screenShareEnabled = false
      this.phase = 'prejoin'
    },
  },
}
</script>

<style lang="scss" scoped>
.video-call__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: $z-index-overlay;
}

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
  // Anchor exactly to the measured header/footer heights so the maximized call
  // butts seamlessly against both bars — no gap. HeaderMenu sets
  // --header-height; PageFooter sets --footer-height (0 on mobile where the
  // footer is hidden). The clicks on the bars trigger the $route watcher in
  // this component, which auto-parks the call.
  top: var(--header-height, 6rem);
  right: 0;
  bottom: var(--footer-height, 0px);
  left: 0;
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

.video-call--modal {
  // Centered popover over the underlying page — the user can still see the
  // group context behind the dimmed backdrop.
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(900px, calc(100vw - #{$space-base * 2}));
  height: min(560px, calc(100vh - #{$space-large * 2}));
  border-radius: $border-radius-base;
  overflow: hidden;
  z-index: $z-index-overlay + 1;
}

@media (max-width: 810px) {
  .video-call--modal {
    // Use the full viewport on mobile — the split layout already collapses
    // vertically inside PreJoin.vue at this breakpoint.
    inset: 0;
    top: 0;
    left: 0;
    transform: none;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
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

  // The RoomTitleLink ships with font-weight: 500 (medium) for its in-chat
  // usage; inside the call modal we want the group name to read as a proper
  // dialog heading, so override with the heading bold weight.
  ::v-deep .room-title-link {
    font-weight: $font-weight-bold;
  }
}

.video-call__header-info {
  display: flex;
  align-items: center;
  gap: $space-x-small;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}

.video-call__avatar {
  flex-shrink: 0;
}

.video-call__header-right {
  display: flex;
  align-items: center;
  gap: $space-xx-small;
  margin-left: auto;
  flex-shrink: 0;
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

.video-call--minimized .video-call__header {
  // Compact padding so avatar + title + count + buttons all fit in 355px.
  padding: $space-xxx-small $space-x-small;
  gap: $space-xx-small;
}

.video-call__body {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: $color-neutral-10;
  position: relative;
  min-height: 0;
}

.video-call__stage {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.video-call__grid {
  display: grid;
  gap: $space-xxx-small;
  padding: $space-xxx-small;
}

.video-call__single {
  display: flex;
}

// Spotlight: big tile fills the left column, the others auto-flow as a
// narrow column of thumbnails on the right. All tiles stay in the same
// container so audio tracks stay attached when toggling spotlight.
//
// `repeat(auto-fill, minmax(90px, 1fr))` creates as many explicit rows as
// fit in the container at ~90 px each. The spotlight tile then spans every
// row via `grid-row: 1 / -1`, while the thumbnails auto-place into the
// narrow right column, one per row.
.video-call__stage--spotlight {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px;
  grid-template-rows: repeat(auto-fill, minmax(90px, 1fr));
  gap: $space-xxx-small;
  padding: $space-xxx-small;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.video-call__stage--spotlight .video-tile--spotlighted {
  grid-column: 1;
  grid-row: 1 / -1;
}

.video-call__stage--spotlight .video-tile:not(.video-tile--spotlighted) {
  grid-column: 2;
}

.video-call__speakers {
  position: absolute;
  top: $space-x-small;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  gap: $space-xx-small;
  justify-content: center;
  max-width: calc(100% - #{$space-base});
  pointer-events: none;
  z-index: 2;
}

.video-call__speaker-chip {
  background: rgba(0, 0, 0, 0.65);
  color: $text-color-inverse;
  padding: 2px $space-x-small;
  border-radius: $border-radius-rounded;
  font-size: $font-size-small;
  font-weight: $font-weight-bold;
  display: inline-flex;
  align-items: center;
}

.video-call__speaker-chip-self {
  font-weight: $font-weight-regular;
  margin-left: $space-xxx-small;
  opacity: 0.85;
}

.video-call__sidebar {
  flex: 0 0 360px;
  max-width: 40%;
  display: flex;
  flex-direction: column;
  background: $background-color-base;
  border-left: 1px solid $color-neutral-85;
  overflow: hidden;
}

.video-call__sidebar > * {
  flex: 1;
  min-height: 0;
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
