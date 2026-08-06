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
          <profile-avatar :profile="groupProfile" size="small" class="video-call__avatar" />
          <room-title-link
            :name="titleLabel"
            :to="groupRoute"
            :show-group-icon="!!groupId"
            :aria-label="$t('videoCall.gotoGroup', { name: groupName || $t('videoCall.title') })"
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
              v-tooltip="minimizeLabel"
              variant="primary"
              appearance="outline"
              size="sm"
              circle
              :aria-label="minimizeLabel"
              @click="toggleMinimize"
            >
              <template #icon>
                <os-icon :icon="minimized ? icons.expand : icons.minus" />
              </template>
            </os-button>
            <os-button
              v-tooltip="closeLabel"
              variant="danger"
              appearance="outline"
              size="sm"
              circle
              :aria-label="closeLabel"
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

      <div v-else-if="error" data-test="video-call-error" class="video-call__error" role="alert">
        <p class="video-call__error-message">{{ error }}</p>
        <div class="video-call__error-actions">
          <os-button
            data-test="video-call-back-to-prejoin"
            variant="primary"
            appearance="outline"
            @click="backToPrejoin"
          >
            {{ $t('videoCall.errorBackToPrejoin') }}
          </os-button>
          <os-button data-test="video-call-retry" variant="primary" @click="retryConnect">
            {{ $t('videoCall.errorRetry') }}
          </os-button>
        </div>
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
          <div
            ref="stageEl"
            :class="['video-call__stage', stageLayoutClass]"
            :style="gridStyleConditional"
          >
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

      <!--
        Every control collapses to an icon-only button in the parked window, so
        each one carries a tooltip fed from the same label as its aria-label —
        one source, no drift between what a screen reader announces and what a
        sighted user reads. The tooltip is suppressed while the label is
        already spelled out next to the icon.
      -->
      <div v-if="phase === 'in-call' && !error" class="video-call__controls">
        <os-button
          v-tooltip="iconOnlyTooltip(micLabel)"
          :variant="micEnabled ? 'default' : 'danger'"
          appearance="outline"
          :size="iconOnly ? 'sm' : 'md'"
          :circle="iconOnly"
          :aria-label="micLabel"
          @click="toggleMic"
        >
          <template #icon>
            <os-icon :icon="micEnabled ? icons.microphone : icons.microphoneSlash" />
          </template>
          <template v-if="!iconOnly">
            {{ micLabel }}
          </template>
        </os-button>
        <os-button
          v-tooltip="iconOnlyTooltip(cameraLabel)"
          :variant="cameraEnabled ? 'default' : 'danger'"
          appearance="outline"
          :size="iconOnly ? 'sm' : 'md'"
          :circle="iconOnly"
          :aria-label="cameraLabel"
          @click="toggleCamera"
        >
          <template #icon>
            <os-icon :icon="icons.videoCamera" />
          </template>
          <template v-if="!iconOnly">
            {{ cameraLabel }}
          </template>
        </os-button>
        <os-button
          v-if="screenShareSupported"
          v-tooltip="iconOnlyTooltip(screenShareLabel)"
          :variant="screenShareEnabled ? 'primary' : 'default'"
          appearance="outline"
          :size="iconOnly ? 'sm' : 'md'"
          :circle="iconOnly"
          :aria-label="screenShareLabel"
          @click="toggleScreenShare"
        >
          <template #icon>
            <os-icon :icon="icons.desktop" />
          </template>
          <template v-if="!iconOnly">
            {{ screenShareLabel }}
          </template>
        </os-button>
        <os-button
          v-if="!isMobile"
          v-tooltip="iconOnlyTooltip(chatLabel)"
          :variant="chatOpenForThisGroup ? 'primary' : 'default'"
          appearance="outline"
          :size="iconOnly ? 'sm' : 'md'"
          :circle="iconOnly"
          :aria-label="chatLabel"
          @click="toggleChat"
        >
          <template #icon>
            <os-icon :icon="icons.chatBubble" />
          </template>
          <template v-if="!iconOnly">
            {{ chatLabel }}
          </template>
        </os-button>
        <os-button
          v-tooltip="iconOnlyTooltip(leaveLabel)"
          variant="danger"
          appearance="filled"
          :size="iconOnly ? 'sm' : 'md'"
          :circle="iconOnly"
          class="video-call__leave"
          :aria-label="leaveLabel"
          @click="leave"
        >
          <template #icon>
            <os-icon :icon="icons.phone" />
          </template>
          <template v-if="!iconOnly">
            {{ leaveLabel }}
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

// How long a participant keeps the speaking treatment after LiveKit drops them
// from the active-speaker list. LiveKit reports raw audio activity, so it lets
// go during the pauses between words — without a hold the chips and frames
// strobe while someone is simply talking.
const SPEAKER_HOLD_MS = 1500

// Cameras publish 16:9, so the grid aims for cells of that shape: the closer a
// cell matches, the less `object-fit: cover` has to crop off the sides.
const TILE_ASPECT_RATIO = 16 / 9

// Below this the 114px large avatar plus its caption no longer fits the cell
// and the flex column starts squashing.
const LARGE_AVATAR_MIN_CELL_HEIGHT = 200
const LARGE_AVATAR_MIN_CELL_WIDTH = 160

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
      stageWidth: 0,
      stageHeight: 0,
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
    micLabel() {
      return this.micEnabled ? this.$t('videoCall.muteMic') : this.$t('videoCall.unmuteMic')
    },
    cameraLabel() {
      return this.cameraEnabled
        ? this.$t('videoCall.disableCamera')
        : this.$t('videoCall.enableCamera')
    },
    screenShareLabel() {
      return this.screenShareEnabled
        ? this.$t('videoCall.stopScreenShare')
        : this.$t('videoCall.startScreenShare')
    },
    chatLabel() {
      return this.chatOpenForThisGroup
        ? this.$t('videoCall.closeChat')
        : this.$t('videoCall.openChat')
    },
    leaveLabel() {
      return this.$t('videoCall.leave')
    },
    minimizeLabel() {
      return this.minimized ? this.$t('videoCall.maximize') : this.$t('videoCall.minimize')
    },
    closeLabel() {
      return this.phase === 'in-call'
        ? this.$t('videoCall.leave')
        : this.$t('videoCall.prejoin.cancel')
    },
    titleLabel() {
      const name = this.groupName || this.$t('videoCall.title')
      // Spell out what the dialog is for while the user is still in the
      // device-setup step — once they're connected the room name alone is
      // enough context.
      if (this.phase === 'prejoin') {
        return this.$t('videoCall.prejoin.headerTitle', { name })
      }
      return name
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
    gridDimensions() {
      // Pick the column count whose resulting cells waste the least space on a
      // 16:9 video. The old `ceil(sqrt(n))` ignored the stage's own shape, so
      // two participants on a wide monitor got two tall, narrow cells — and
      // `object-fit: cover` then cropped everything but a vertical strip of
      // each face, which is what reads as "stretched".
      const count = Math.max(1, this.tiles.length)
      if (!this.stageWidth || !this.stageHeight) {
        // Nothing measured yet (SSR, first paint, no ResizeObserver): keep the
        // square-ish heuristic rather than collapsing to a single column.
        const columns = Math.ceil(Math.sqrt(count))
        return { columns, rows: Math.ceil(count / columns) }
      }
      let best = { columns: 1, rows: count, area: -1 }
      for (let columns = 1; columns <= count; columns++) {
        const rows = Math.ceil(count / columns)
        const cellWidth = this.stageWidth / columns
        const cellHeight = this.stageHeight / rows
        // Largest 16:9 rectangle that fits this cell — maximising it maximises
        // the visible video area.
        const fittedWidth = Math.min(cellWidth, cellHeight * TILE_ASPECT_RATIO)
        const area = (fittedWidth * fittedWidth) / TILE_ASPECT_RATIO
        // `>=` so a tie goes to the wider arrangement: two people on a 16:9
        // stage fit equally well side by side or stacked, and side by side is
        // what every other call app does.
        if (area >= best.area) best = { columns, rows, area }
      }
      return { columns: best.columns, rows: best.rows }
    },
    cellSize() {
      if (!this.stageWidth || !this.stageHeight) return { width: 0, height: 0 }
      // Outside the regular grid a tile owns the whole stage: the minimized
      // window shows exactly one, and the spotlight tile fills the wide cell
      // (its thumbnails are sized separately in tileAvatarSize).
      if (!this.isFullscreen || this.spotlightTile) {
        return { width: this.stageWidth, height: this.stageHeight }
      }
      const { columns, rows } = this.gridDimensions
      return { width: this.stageWidth / columns, height: this.stageHeight / rows }
    },
    gridStyle() {
      const { columns, rows } = this.gridDimensions
      return {
        'grid-template-columns': `repeat(${columns}, 1fr)`,
        // Explicit rows: without them the implicit rows size to content and
        // the tiles never share the stage height evenly.
        'grid-template-rows': `repeat(${rows}, 1fr)`,
      }
    },
  },
  watch: {
    show: {
      immediate: true,
      handler(open, wasOpen) {
        if (open) {
          this.phase = 'prejoin'
          this.error = null
        } else if (wasOpen) {
          // Only tear down if we were actually open before — on the initial
          // mount with show=false there is nothing to clean up, and the
          // resulting phase='prejoin' would clobber the store's 'idle' default.
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
    async $route(to) {
      // Keep the minimized/maximized state in sync with the URL when the user
      // navigates via links, browser back/forward, or our own routing helpers.
      if (!this.show) return
      const onCall = to.name === 'call-id-slug'
      // A failed connect holds no session worth preserving — minimizing only
      // exists so a *live* room survives navigation. Parking an error card in
      // the corner would be litter the user still has to dismiss, and leaving
      // it full screen blocks the page they just navigated to. Close instead.
      // Deliberately not leave(): its router.replace would hijack the
      // navigation that is running right now.
      if (this.phase === 'error') {
        if (!onCall) await this.closeAfterError()
        return
      }
      if (this.phase !== 'connecting' && this.phase !== 'in-call') return
      if (onCall && this.minimized) this.setMinimized(false)
      else if (!onCall && !this.minimized) this.setMinimized(true)
    },
  },
  created() {
    this.icons = iconRegistry
    // Non-reactive bookkeeping: identity -> timestamp of the last report from
    // LiveKit. Insertion order doubles as a stable display order, so a speaker
    // who keeps talking never jumps around the chip row.
    this.speakerSeenAt = new Map()
    this.speakerHoldTimer = null
    this.stageObserver = null
    this.observedStage = null
  },
  mounted() {
    this.observeStage()
  },
  updated() {
    // The stage only exists in some phases, so re-check after every render
    // rather than wiring this up once. observeStage() bails out when the
    // element is unchanged, which also keeps the observer's own updates from
    // looping.
    this.observeStage()
  },
  beforeDestroy() {
    this.disconnectStageObserver()
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
    observeStage() {
      const el = this.$refs.stageEl || null
      if (el === this.observedStage) return
      this.disconnectStageObserver()
      this.observedStage = el
      if (!el) {
        this.stageWidth = 0
        this.stageHeight = 0
        return
      }
      this.measureStage()
      if (typeof ResizeObserver === 'undefined') return
      // Window resize alone would miss the cases that matter most here: the
      // in-call chat sidebar opening, or minimize/maximize resizing the panel.
      this.stageObserver = new ResizeObserver(() => this.measureStage())
      this.stageObserver.observe(el)
    },
    measureStage() {
      const el = this.observedStage
      if (!el) return
      const width = el.clientWidth || 0
      const height = el.clientHeight || 0
      if (width === this.stageWidth && height === this.stageHeight) return
      this.stageWidth = width
      this.stageHeight = height
    },
    disconnectStageObserver() {
      if (this.stageObserver) {
        this.stageObserver.disconnect()
        this.stageObserver = null
      }
      this.observedStage = null
    },
    noteActiveSpeakers(identities) {
      const now = Date.now()
      for (const identity of identities) this.speakerSeenAt.set(identity, now)
      this.applyActiveSpeakers()
    },
    applyActiveSpeakers() {
      const now = Date.now()
      const next = []
      let soonestExpiry = null
      for (const [identity, seenAt] of this.speakerSeenAt) {
        const remaining = SPEAKER_HOLD_MS - (now - seenAt)
        if (remaining > 0) {
          next.push(identity)
          if (soonestExpiry === null || remaining < soonestExpiry) soonestExpiry = remaining
        } else {
          this.speakerSeenAt.delete(identity)
        }
      }
      const prev = this.activeSpeakerIds
      if (prev.length !== next.length || !prev.every((id, i) => id === next[i])) {
        this.activeSpeakerIds = next
      }
      if (this.speakerHoldTimer) {
        clearTimeout(this.speakerHoldTimer)
        this.speakerHoldTimer = null
      }
      // Falling out of the list is driven by the clock, not by an event —
      // LiveKit has nothing more to report once someone stops talking.
      if (soonestExpiry !== null) {
        this.speakerHoldTimer = setTimeout(() => {
          this.speakerHoldTimer = null
          this.applyActiveSpeakers()
        }, soonestExpiry)
      }
    },
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
      // Same reasoning for any cramped cell: a 3x3 grid on a phone, or the
      // parked window, leaves nowhere near enough room for the 114px avatar.
      const { width, height } = this.cellSize
      if (height && height < LARGE_AVATAR_MIN_CELL_HEIGHT) return 'small'
      if (width && width < LARGE_AVATAR_MIN_CELL_WIDTH) return 'small'
      return 'large'
    },
    iconOnlyTooltip(label) {
      // v-tooltip renders nothing for an empty string — exactly what we want
      // once the button spells its label out next to the icon.
      return this.iconOnly ? label : ''
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
        const { Room, RoomEvent, Track, DisconnectReason } = livekit
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
        // A remote participant withdrawing a track — most visibly, ending a
        // screen share. Without this the tile can outlive its track and keep
        // painting the last decoded frame.
        room.on(RoomEvent.TrackUnpublished, onAny)
        // LiveKit's setCameraEnabled(false) mutes the track instead of
        // unpublishing it. Re-render so the avatar fallback kicks in.
        room.on(RoomEvent.TrackMuted, onAny)
        room.on(RoomEvent.TrackUnmuted, onAny)
        // Token metadata carries the avatar URL — re-render tiles when it
        // changes so the avatar updates without a reconnect.
        room.on(RoomEvent.ParticipantMetadataChanged, onAny)
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          // Feed the hold window rather than mirroring LiveKit directly: it
          // fires many times per second and drops people during the gaps
          // between words. Highlighting is applied at once, removal waits out
          // SPEAKER_HOLD_MS.
          this.noteActiveSpeakers((speakers || []).map((p) => p.identity))
        })
        room.on(RoomEvent.LocalTrackPublished, () => {
          this.screenShareEnabled = !!room.localParticipant.isScreenShareEnabled
          onAny()
        })
        room.on(RoomEvent.LocalTrackUnpublished, () => {
          this.screenShareEnabled = !!room.localParticipant.isScreenShareEnabled
          onAny()
        })
        // Server-side disconnect: take the same path as the user-initiated
        // Leave button so we navigate away from /call/... before clearing the
        // store — otherwise the call page's watcher would immediately re-open
        // the prejoin popover for the same group.
        //
        // LiveKit also fires Disconnected when WE call room.disconnect()
        // (e.g. retryConnect()'s teardown, leave()'s cleanup). Skip those —
        // the caller already drives the next step and a re-entrant leave()
        // would clobber the retry/leave flow.
        room.on(RoomEvent.Disconnected, (reason) => {
          if (reason === DisconnectReason.CLIENT_INITIATED) return
          this.leave()
        })

        // LiveKit defaults to a 15 s WebSocket + 15 s peer-connection timeout
        // plus retries — that's a long time to leave the user staring at
        // "Connecting…" when the URL is unreachable, and it explodes the
        // Cypress error-path scenario well beyond the per-step wait budget.
        // Cap both at 5 s so a misconfigured / unreachable LiveKit instance
        // surfaces the error block quickly.
        await room.connect(payload.url, payload.token, {
          websocketTimeout: 5000,
          peerConnectionTimeout: 5000,
          maxRetries: 0,
        })
        if (this.micEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true)
        }
        if (this.cameraEnabled) {
          await room.localParticipant.setCameraEnabled(true)
        }
        this.refreshTiles()
        this.phase = 'in-call'
      } catch (err) {
        const message = (err && err.message) || String(err)
        // The user navigated away while the handshake was still running, so
        // the window is parked in the corner. Since isFullscreen treats every
        // non-'in-call' phase as full screen, showing the error block here
        // would blow the parked window back up over the page they moved to.
        // There is no session to park either — toast the reason and close.
        if (this.minimized) {
          if (this.$toast && typeof this.$toast.error === 'function') {
            this.$toast.error(message)
          }
          await this.closeAfterError()
          return
        }
        this.error = message
        // Distinct phase so the header stops pretending there's a live room
        // (no participant counter, no minimize button, no in-call controls)
        // while the error block is shown.
        this.phase = 'error'
      }
    },
    async closeAfterError() {
      // No navigation here — unlike leave(), every caller either is already
      // navigating or was never on the call route to begin with.
      await this.cleanup()
      this.close()
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
        // Only trust http(s) URLs — even though the backend currently writes
        // metadata server-side, a future canUpdateOwnMetadata grant or a
        // misconfigured deployment could let participants inject e.g.
        // "javascript:..." which would land in <img src> via ResponsiveImage.
        const rawAvatarUrl = meta && typeof meta.avatarUrl === 'string' ? meta.avatarUrl : null
        let avatarUrl = null
        if (rawAvatarUrl) {
          try {
            const parsed = new URL(rawAvatarUrl, window.location.origin)
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
              avatarUrl = rawAvatarUrl
            }
          } catch (_e) {
            /* malformed URL — fall through to null */
          }
        }
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
        // Re-sync from LiveKit — a partial failure (track published, then
        // permission revoked) can leave the real state out of sync with what
        // we'd otherwise leave in `this.micEnabled`.
        this.micEnabled = !!this.room.localParticipant.isMicrophoneEnabled
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
        this.cameraEnabled = !!this.room.localParticipant.isCameraEnabled
        this.refreshTiles()
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
        this.screenShareEnabled = !!this.room.localParticipant.isScreenShareEnabled
        this.refreshTiles()
        // NotAllowedError on screen-share usually means the user dismissed the
        // OS picker — that's not worth a toast. Surface anything else.
        if (err && err.name !== 'NotAllowedError') {
          this.showDeviceErrorToast('screen', err)
        }
      }
    },
    async retryConnect() {
      // Tear down whatever half-initialized room may exist from the failed
      // attempt so listeners and tracks from the previous try don't leak.
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
      this.error = null
      await this.connect()
    },
    backToPrejoin() {
      this.error = null
      this.phase = 'prejoin'
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
        // Belt-and-braces: stop every local track ourselves before asking
        // LiveKit to disconnect. LiveKit's room.disconnect(stopTracks=true)
        // misses tracks under several real-world conditions (muted at
        // disconnect time, replaced sources, screen-share remnants), which
        // leaves the browser's camera / mic recording indicator stuck on
        // until the user reloads the tab.
        try {
          const lp = this.room.localParticipant
          if (lp) {
            const pubs = [
              ...(lp.audioTrackPublications?.values?.() ?? []),
              ...(lp.videoTrackPublications?.values?.() ?? []),
            ]
            for (const pub of pubs) {
              const track = pub && pub.track
              if (!track) continue
              try {
                track.stop()
              } catch (_e) {
                /* noop */
              }
              // Some LiveKit versions keep the underlying MediaStreamTrack
              // around even after track.stop(); stop it directly too.
              const mediaTrack = track.mediaStreamTrack
              if (mediaTrack && typeof mediaTrack.stop === 'function') {
                try {
                  mediaTrack.stop()
                } catch (_e) {
                  /* noop */
                }
              }
            }
          }
        } catch (_e) {
          /* noop */
        }
        try {
          await this.room.disconnect(true)
        } catch (_e) {
          /* ignore */
        }
        this.room = null
      }
      if (this.speakerHoldTimer) {
        clearTimeout(this.speakerHoldTimer)
        this.speakerHoldTimer = null
      }
      this.speakerSeenAt.clear()
      this.tiles = []
      this.activeSpeakerIds = []
      this.spotlightKey = null
      this.micEnabled = true
      this.cameraEnabled = true
      this.screenShareEnabled = false
      // CRITICAL: do NOT set phase = 'prejoin' here. leave() runs cleanup()
      // BEFORE close(), so the Vuex `show` flag is still true when cleanup
      // finishes. A prejoin phase would make the template re-mount <pre-join>
      // in the lingering window — and PreJoin's mounted() immediately calls
      // initDevices() → getUserMedia(), turning the camera back on right
      // after we just stopped it. Reset to 'idle' so nothing renders during
      // the brief gap between cleanup() and close(); the `show` watcher will
      // set phase back to 'prejoin' the next time the dialog opens.
      this.phase = 'idle'
      this.error = null
    },
  },
}
</script>

<style scoped>
.video-call__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-index-overlay);
}

.video-call {
  position: fixed;
  background: var(--background-color-base);
  color: var(--text-color-base);
  display: flex;
  flex-direction: column;
  z-index: var(--z-index-overlay);
  box-shadow: var(--box-shadow-large);
  font-family: var(--font-family-text);
}

.video-call--maximized {
  /*  Match the map page's layering pattern (see pages/map.vue): cover the full */
  /*  viewport (top: 0, bottom: 0) and sit at var(--z-index-surface) so the page */
  /*  header (.main-navigation, z-index: var(--z-index-page-submenu) = 2500) and the */
  /*  sticky footer (.ds-footer, z-index: 10) both stack on top — their own */
  /*  box-shadows then naturally fall onto the call surface from above and */
  /*  below. Padding (not offset) keeps the call's internal header and */
  /*  controls below the page header / above the page footer. */
  /*  HeaderMenu sets --header-height; PageFooter sets --footer-height (0 on */
  /*  mobile where the footer is hidden). */
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  padding-top: var(--header-height, 6rem);
  padding-bottom: var(--footer-height, 0px);
  z-index: var(--z-index-surface);
  /*  The base .video-call rule paints a var(--box-shadow-large) around the panel. */
  /*  When the panel covers the full viewport that shadow has nowhere to land */
  /*  — and worse, the panel's own shadow competes with the header/footer */
  /*  shadows along the top and bottom seams. Drop it in the maximized state. */
  box-shadow: none;
}

.video-call--minimized {
  /*  Match the chat's footer offset so the minimized window sits above the */
  /*  desktop footer instead of flush with the viewport edge. */
  bottom: 45px;
  right: 0;
  width: 355px;
  height: 280px;
  border-top-left-radius: var(--border-radius-base);
  border-top-right-radius: var(--border-radius-base);
  overflow: hidden;
}

.video-call--modal {
  /*  Centered popover over the underlying page — the user can still see the */
  /*  group context behind the dimmed backdrop. */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(900px, calc(100vw - var(--space-base) * 2));
  height: min(560px, calc(100vh - var(--space-large) * 2));
  border-radius: var(--border-radius-base);
  overflow: hidden;
  /*  calc(), not Sass '+': the tokens are var() now and Sass cannot add those. */
  z-index: calc(var(--z-index-overlay) + 1);
}

@media (max-width: 810px) {
  .video-call--modal {
    /*  Use the full viewport on mobile — the split layout already collapses */
    /*  vertically inside PreJoin.vue at this breakpoint. */
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
  gap: var(--space-x-small);
  padding: var(--space-x-small) var(--space-small);
  /*  Keep the header field at its pre-existing visual height even though the */
  /*  avatar shrank from base (44px) to small (34px) — matches the chat header. */
  min-height: calc(var(--size-avatar-base) + 2 * var(--space-x-small));
  background: var(--color-header-background);
  border-bottom: 1px solid var(--color-neutral-85);
  font-weight: var(--text-weight-bold);
  color: var(--text-color-base);

  /*  The RoomTitleLink ships with font-weight: 500 (medium) for its in-chat */
  /*  usage; inside the call modal we want the group name to read as a proper */
  /*  dialog heading, so override with the heading bold weight. */
  ::v-deep .room-title-link {
    font-weight: var(--text-weight-bold);
  }
}

.video-call__header-info {
  display: flex;
  align-items: center;
  gap: var(--space-x-small);
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
  gap: var(--space-xx-small);
  margin-left: auto;
  flex-shrink: 0;
}

.video-call__count {
  background: var(--color-primary);
  color: var(--color-primary-inverse);
  padding: 2px var(--space-x-small);
  border-radius: var(--border-radius-rounded);
  font-size: var(--font-size-small);
  min-width: 28px;
  text-align: center;
}

.video-call__header-actions {
  display: flex;
  gap: var(--space-xxx-small);
  align-items: center;
}

.video-call--minimized .video-call__header {
  /*  Compact padding so avatar + title + count + buttons all fit in 355px. */
  padding: var(--space-xxx-small) var(--space-x-small);
  gap: var(--space-xx-small);
}

.video-call__body {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: var(--color-neutral-10);
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
  gap: var(--space-xxx-small);
  padding: var(--space-xxx-small);
}

.video-call__single {
  display: flex;
}

/*  Spotlight: big tile fills the left column, the others auto-flow as a */
/*  narrow column of thumbnails on the right. All tiles stay in the same */
/*  container so audio tracks stay attached when toggling spotlight. */
/**/
/*  `repeat(auto-fill, minmax(90px, 1fr))` creates as many explicit rows as */
/*  fit in the container at ~90 px each. The spotlight tile then spans every */
/*  row via `grid-row: 1 / -1`, while the thumbnails auto-place into the */
/*  narrow right column, one per row. */
.video-call__stage--spotlight {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px;
  grid-template-rows: repeat(auto-fill, minmax(90px, 1fr));
  gap: var(--space-xxx-small);
  padding: var(--space-xxx-small);
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
  top: var(--space-x-small);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xx-small);
  justify-content: center;
  max-width: calc(100% - var(--space-base));
  pointer-events: none;
  z-index: 2;
}

.video-call__speaker-chip {
  background: rgba(0, 0, 0, 0.65);
  color: var(--text-color-inverse);
  padding: 2px var(--space-x-small);
  border-radius: var(--border-radius-rounded);
  font-size: var(--font-size-small);
  font-weight: var(--text-weight-bold);
  display: inline-flex;
  align-items: center;
}

.video-call__speaker-chip-self {
  font-weight: var(--text-weight-regular);
  margin-left: var(--space-xxx-small);
  opacity: 0.85;
}

.video-call__sidebar {
  flex: 0 0 360px;
  max-width: 40%;
  display: flex;
  flex-direction: column;
  background: var(--background-color-base);
  border-left: 1px solid var(--color-neutral-85);
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
  padding: var(--space-small);
  text-align: center;
  color: var(--text-color-inverse);
}

.video-call__error {
  color: var(--color-danger-inverse);
  background: var(--color-danger);
  flex-direction: column;
  gap: var(--space-small);
}

.video-call__error-message {
  margin: 0;
}

.video-call__error-actions {
  display: flex;
  gap: var(--space-x-small);
  flex-wrap: wrap;
  justify-content: center;
}

.video-call__controls {
  display: flex;
  gap: var(--space-x-small);
  padding: var(--space-x-small) var(--space-small);
  background: var(--background-color-soft);
  border-top: 1px solid var(--color-neutral-85);
  flex-wrap: wrap;
  justify-content: center;
}

.video-call--minimized .video-call__controls {
  /*  Tighter spacing for the icon-only row in the parked window. */
  padding: var(--space-xxx-small) var(--space-x-small);
  gap: var(--space-xxx-small);
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
