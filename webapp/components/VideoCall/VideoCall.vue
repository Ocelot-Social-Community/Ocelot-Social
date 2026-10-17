<template>
  <div v-if="show" class="video-call-root">
    <div v-if="isPreJoinModal" class="video-call__backdrop" @click="leave" />
    <div
      :class="[
        'video-call',
        modeClass,
        {
          'video-call--bars-overlay': barsOverlay,
          'video-call--bars-hidden': barsOverlay && barsHidden,
          'video-call--bars-manual': barsManual,
          'video-call--bars-collapsed': barsManual && barsCollapsed,
          'video-call--parked-bars': parked,
          'video-call--chromium': isChromium,
          'video-call--bars-held': parked && (showDeviceSettings || pointerOnParked),
        },
      ]"
      role="dialog"
      :aria-modal="isPreJoinModal ? 'true' : null"
      :aria-label="$t('videoCall.dialogLabel')"
      @click.stop
      @mouseenter="pointerOnParked = true"
      @mouseleave="pointerOnParked = false"
      @transitionend.self="measureStage"
    >
      <room-header
        class="video-call__header"
        compact
        :profile="groupProfile"
        :title="titleLabel"
        :to="groupRoute"
        :show-group-icon="!!groupId"
        :aria-label="$t('videoCall.gotoGroup', { name: groupName || $t('videoCall.title') })"
        @title-click="onGroupLinkClick"
      >
        <span
          v-if="phase === 'in-call'"
          class="video-call__count"
          data-test="video-call-participants"
        >
          {{ uniqueParticipantCount }}
        </span>
        <div class="video-call__header-actions">
          <os-button
            v-if="barsManual"
            v-tooltip="$t('videoCall.hideBars')"
            data-test="video-call-hide-bars"
            variant="primary"
            appearance="outline"
            size="sm"
            circle
            :aria-label="$t('videoCall.hideBars')"
            @click="barsCollapsed = true"
          >
            <template #icon>
              <os-icon :icon="icons.expandVertical" />
            </template>
          </os-button>
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
              <os-icon :icon="minimized ? icons.expand : icons.compress" />
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
      </room-header>

      <!--
        In the parked window header and control bar show only while the mouse is on it,
        and the number of participants stays in their place meanwhile.
      -->
      <span
        v-if="parked"
        class="video-call__parked-count"
        data-test="video-call-parked-count"
        aria-hidden="true"
      >
        {{ uniqueParticipantCount }}
      </span>

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

      <div v-else :class="['video-call__body', { 'video-call__body--chat-below': mobileChatOpen }]">
        <div v-if="phase === 'connecting'" class="video-call__status">
          {{ $t('videoCall.connecting') }}
        </div>
        <template v-else>
          <!--
            Problems the call cannot fix on its own. They show in the parked
            window too: a blocked speaker or a silent microphone matters there
            just as much.
          -->
          <div
            v-if="audioBlocked || micProblem || reconnecting || audioOnly || reloadPending"
            class="video-call__notices"
            role="status"
          >
            <!--
              An admin switched the branding; applying it takes a reload, which waits for this
              call to end (#10353). Said here for as long as it waits, so that the reload after
              hanging up comes as no surprise.
            -->
            <div
              v-if="reloadPending"
              class="video-call__notice"
              data-test="video-call-reload-pending"
            >
              {{ $t('videoCall.reloadPending') }}
            </div>
            <div v-if="reconnecting" class="video-call__notice" data-test="video-call-reconnecting">
              {{ $t('videoCall.reconnecting') }}
            </div>
            <div
              v-if="audioBlocked"
              class="video-call__notice video-call__notice--warning"
              data-test="video-call-audio-blocked"
            >
              <span>{{ $t('videoCall.audioBlocked') }}</span>
              <os-button
                data-test="video-call-enable-audio"
                variant="primary"
                size="sm"
                @click="enableAudio"
              >
                {{ $t('videoCall.enableAudio') }}
              </os-button>
            </div>
            <div
              v-if="micProblem"
              class="video-call__notice video-call__notice--warning"
              data-test="video-call-mic-problem"
            >
              <span>{{ $t('videoCall.micNoSignal') }}</span>
              <os-button
                data-test="video-call-restart-mic"
                variant="primary"
                size="sm"
                @click="restartMic"
              >
                {{ $t('videoCall.restartMic') }}
              </os-button>
            </div>
            <div v-if="audioOnly" class="video-call__notice" data-test="video-call-audio-only">
              <span>{{ $t('videoCall.audioOnly') }}</span>
              <os-button
                data-test="video-call-show-videos"
                variant="primary"
                appearance="outline"
                size="sm"
                @click="showVideos"
              >
                {{ $t('videoCall.showVideos') }}
              </os-button>
            </div>
          </div>
          <div
            v-if="isFullscreen && !mobileChatOpen && activeSpeakers.length"
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
              The bars moved away on purpose: this alone stays, where the header's buttons
              were, to bring them back. In a wrapper of its own: OsButton's root carries no
              scoped-style attribute, so a position set on it would not apply, and the button
              would take a row of the tiles' grid.
            -->
            <div v-if="barsManual && barsCollapsed" class="video-call__show-bars">
              <os-button
                v-tooltip="$t('videoCall.showBars')"
                data-test="video-call-show-bars"
                variant="primary"
                appearance="filled"
                size="sm"
                circle
                :aria-label="$t('videoCall.showBars')"
                @click="barsCollapsed = false"
              >
                <template #icon>
                  <os-icon :icon="icons.compressVertical" />
                </template>
              </os-button>
            </div>
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
              :camera-starting="isOwnCameraTile(tile) && devicesStarting.videoinput > 0"
              :mic-starting="isOwnCameraTile(tile) && devicesStarting.audioinput > 0"
              :avatar-size="tileAvatarSize(tile)"
              :clickable="isFullscreen && !mobileChatOpen"
              :class="{
                'video-tile--hidden': singleTile && soloTile && tile.key !== soloTile.key,
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
            <!--
              Two chats in a call: the conference chat only its participants share,
              and the group's own, which reaches every member. The choice is offered
              once the server has confirmed the participation — until then, and if
              it never does, the sidebar is the group's chat as it always was.
            -->
            <!--
              The chat brings no header of its own here (hideHeader): group and
              avatar are in the call's header right above, and which chat it is the
              tabs say. What its header offered besides sits at the end of this row.
            -->
            <div class="video-call__chat-tabs">
              <call-chat-tabs
                v-if="chatRoomId"
                exportable
                :exporting="chatExporting"
                :exportEmpty="callChatEmpty"
                @export="exportCallChat"
              />
              <div class="video-call__chat-actions">
                <os-button
                  data-test="video-call-close-chat"
                  variant="primary"
                  appearance="outline"
                  circle
                  size="sm"
                  :aria-label="$t('chat.closeChat')"
                  :title="$t('chat.closeChat')"
                  @click="closeInCallChat"
                >
                  <template #icon>
                    <os-icon :icon="icons.close" />
                  </template>
                </os-button>
              </div>
            </div>
            <client-only>
              <chat
                ref="inCallChat"
                :key="activeChatTab"
                singleRoom
                fitParent
                hideHeader
                :groupId="activeChatTab === 'group' ? groupId : null"
                :roomId="activeChatTab === 'call' ? chatRoomId : null"
                :hint="chatHint"
                @empty-change="onChatEmptyChange"
                :hintKey="activeChatTab ? 'call-chat-' + activeChatTab : null"
                :autoFocus="!isMobile"
                @close-single-room="closeInCallChat"
              />
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
          v-tooltip="controlTooltip(micAction)"
          :variant="micEnabled ? 'default' : 'danger'"
          appearance="outline"
          :size="parked ? 'sm' : 'md'"
          :circle="iconOnly"
          :aria-label="micAction"
          :loading="devicesStarting.audioinput > 0"
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
          v-tooltip="controlTooltip(cameraAction)"
          :variant="cameraEnabled ? 'default' : 'danger'"
          appearance="outline"
          :size="parked ? 'sm' : 'md'"
          :circle="iconOnly"
          :aria-label="cameraAction"
          :loading="devicesStarting.videoinput > 0"
          @click="toggleCamera"
        >
          <template #icon>
            <os-icon :icon="cameraEnabled ? icons.videoCamera : icons.videoCameraSlash" />
          </template>
          <template v-if="!iconOnly">
            {{ cameraLabel }}
          </template>
        </os-button>
        <os-button
          v-if="screenShareSupported"
          v-tooltip="controlTooltip(screenShareAction)"
          :variant="screenShareEnabled ? 'primary' : 'default'"
          appearance="outline"
          :size="parked ? 'sm' : 'md'"
          :circle="iconOnly"
          :aria-label="screenShareAction"
          @click="toggleScreenShare"
        >
          <template #icon>
            <os-icon :icon="icons.desktop" />
          </template>
          <template v-if="!iconOnly">
            {{ screenShareLabel }}
          </template>
        </os-button>
        <!--
          Button and panel share one wrapper so a click on either counts as
          "inside" for the click-outside handling. The wrapper is not
          positioned: the panel anchors to the whole control bar.
        -->
        <div ref="deviceSettingsEl" class="video-call__device-settings">
          <os-button
            ref="deviceSettingsToggle"
            v-tooltip="deviceSettingsTooltip"
            data-test="video-call-device-settings-toggle"
            :variant="showDeviceSettings ? 'primary' : 'default'"
            appearance="outline"
            :size="parked ? 'sm' : 'md'"
            :circle="iconOnly"
            :aria-label="deviceSettingsLabel"
            :aria-expanded="showDeviceSettings.toString()"
            @click="toggleDeviceSettings"
          >
            <template #icon>
              <os-icon :icon="icons.cogs" />
            </template>
            <template v-if="!iconOnly">
              {{ deviceSettingsLabel }}
            </template>
          </os-button>
          <device-settings
            v-if="showDeviceSettings"
            class="video-call__device-settings-panel"
            :camera-device-id="cameraDeviceId"
            :mic-device-id="micDeviceId"
            :speaker-device-id="speakerDeviceId"
            :meter-stream="micMeterStream"
            :camera-starting="devicesStarting.videoinput > 0"
            :mic-starting="devicesStarting.audioinput > 0"
            @switch="switchDevice"
            @close="closeDeviceSettings({ restoreFocus: true })"
          />
        </div>
        <os-button
          v-tooltip="controlTooltip(chatAction)"
          :variant="chatOpenForThisCall ? 'primary' : 'default'"
          appearance="outline"
          :size="parked ? 'sm' : 'md'"
          :circle="iconOnly"
          :aria-label="chatAction"
          @click="toggleChat"
        >
          <template #icon>
            <os-counter-icon :icon="icons.chatBubble" :count="chatButtonUnread" danger />
          </template>
          <template v-if="!iconOnly">
            {{ chatLabel }}
          </template>
        </os-button>
        <os-button
          v-tooltip="controlTooltip(leaveAction)"
          variant="danger"
          appearance="filled"
          :size="parked ? 'sm' : 'md'"
          :circle="iconOnly"
          class="video-call__leave"
          :aria-label="leaveAction"
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
import { OsButton, OsCounterIcon, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import mobile from '~/mixins/mobile'
import { joinGroupVideoCallMutation, joinGroupVideoCallChatMutation } from '~/graphql/VideoCalls'
import { roomUnreadQuery, roomUpdated } from '~/graphql/Rooms'
import Chat from '~/components/Chat/Chat.vue'
import CallChatTabs from '~/components/VideoCall/CallChatTabs.vue'
import { activeCallChatTab, callChatTarget } from '~/components/VideoCall/callChat'
import RoomHeader from '~/components/_new/generic/RoomHeader/RoomHeader.vue'
import VideoTile from './VideoTile.vue'
import PreJoin from './PreJoin.vue'
import DeviceSettings from './DeviceSettings.vue'
import { saveDevicePreference } from './devicePreferences'

// How long a participant keeps the speaking treatment after LiveKit drops them
// from the active-speaker list. LiveKit reports raw audio activity, so it lets
// go during the pauses between words — without a hold the chips and frames
// strobe while someone is simply talking.
const SPEAKER_HOLD_MS = 1500

// The join token is fetched while the user is still in the pre-join dialog, so
// the click only has to open the socket. The backend decides on the spot
// whether this user may OPEN a call (nobody in it yet) — a token kept for long
// would carry that decision past the moment it was true. Older ones are
// fetched anew on join; the preloaded client library still saves its share.
const PREFETCHED_TOKEN_MAX_AGE_MS = 60000
// Asking for the call's conference chat: how often, and how long between two attempts.
const CALL_CHAT_JOIN_ATTEMPTS = 3
const CALL_CHAT_JOIN_RETRY_MS = 2000

// LiveKit rates every participant's connection several times a minute. Videos
// are paused once ours stays weak this long, and come back only after it has
// been fine for clearly longer, so a flaky line doesn't make them flicker.
const WEAK_CONNECTION_MS = 5000
const RECOVERED_CONNECTION_MS = 20000
const WEAK_QUALITIES = ['poor', 'lost']
// A capture that was just opened may deliver nothing but silence for a moment
// — Firefox takes noticeably longer than LiveKit's single check 200 ms after
// the start allows for. Only silence that lasts through this many further
// checks, this far apart, counts as a microphone that delivers nothing.
const MIC_SILENCE_RECHECKS = 5
const MIC_SILENCE_RECHECK_MS = 400
const STRONG_QUALITIES = ['excellent', 'good']

// The call's header and control bar on a desktop with the call maximized, and the page's
// header and footer with them: how long the mouse has to rest before they move out of the
// way, and how close to the window's upper or lower edge it brings them back from the chat.
const BARS_HIDE_MS = 4000
const BARS_EDGE_PX = 50
// What brings the bars back. Focus too, for whoever moves through the controls by keyboard.
const BARS_ACTIVITY_EVENTS = ['mousemove', 'pointerdown', 'keydown', 'wheel', 'focusin']
// A tap is followed by the mouse events and the focus the browser makes up for it; they
// come within this time and are no activity of their own.
const TOUCH_ECHO_MS = 800

// Cameras publish 16:9, so the grid aims for cells of that shape: the closer a
// cell matches, the less `object-fit: cover` has to crop off the sides.
const TILE_ASPECT_RATIO = 16 / 9

// Below this the 114px large avatar plus its caption no longer fits the cell
// and the flex column starts squashing.
const LARGE_AVATAR_MIN_CELL_HEIGHT = 200
const LARGE_AVATAR_MIN_CELL_WIDTH = 160

// Which piece of our state holds the device of each MediaDeviceKind.
const DEVICE_FIELDS = {
  videoinput: 'cameraDeviceId',
  audioinput: 'micDeviceId',
  audiooutput: 'speakerDeviceId',
}

// Element.matches() throws on a selector the browser does not know.
const matchesSafely = (element, selector) => {
  try {
    return element.matches(selector)
  } catch {
    return false
  }
}

export default {
  name: 'VideoCall',
  components: {
    VideoTile,
    PreJoin,
    DeviceSettings,
    OsButton,
    OsCounterIcon,
    OsIcon,
    CallChatTabs,
    Chat,
    RoomHeader,
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
      // What is shared: 'monitor', 'window' or 'browser' (a tab), as the browser says.
      screenShareSurface: null,
      error: null,
      cameraDeviceId: null,
      micDeviceId: null,
      speakerDeviceId: null,
      Track: null,
      activeSpeakerIds: [],
      spotlightKey: null,
      stageWidth: 0,
      stageHeight: 0,
      // The browser refused to start remote audio without a fresh user gesture
      // (autoplay policy). Remote audio stays silent until enableAudio() runs.
      audioBlocked: false,
      // Our microphone is published but delivers nothing: the OS took the device
      // away (LiveKit then pauses the upstream) or it only yields digital silence.
      micProblem: false,
      reconnecting: false,
      // Remote cameras are unsubscribed because our connection is weak — the
      // sound gets the bandwidth. audioOnlyDismissed: the user asked for the
      // videos back, so we stop deciding for them until the next call.
      audioOnly: false,
      audioOnlyDismissed: false,
      showDeviceSettings: false,
      // What the browser lists, to put a name to the devices in use.
      knownDevices: [],
      // Devices on their way, per kind — a camera can take seconds to start,
      // and its button, the own tile and the device settings say so
      // meanwhile. Counted, as the user may pick again before the first
      // switch is through.
      devicesStarting: { videoinput: 0, audioinput: 0, audiooutput: 0 },
      // What the level meter in the device settings listens to: the very
      // microphone track the others hear.
      micMeterStream: null,
      chatExporting: false,
      // Whether the conference chat on screen is known to hold no message (see Chat.vue).
      callChatEmpty: false,
      // The remote participant heard last. Whoever spoke stays on screen next to
      // the chat on a phone until somebody else speaks (see speakerTile).
      lastRemoteSpeakerId: null,
      // The bars lying on the videos have moved out of the way (see barsOverlay).
      barsHidden: false,
      // The user moved the bars of the maximized call out of the way (see barsManual). For
      // this one call: the next one starts with them.
      barsCollapsed: false,
      // The mouse is on the call's window: in the parked one that shows its bars. Not
      // :hover, which Safari does not set on it.
      pointerOnParked: false,
      // Only Chromium-based browsers (Chrome, Edge, Opera, …) know navigator.userAgentData.
      // Set once mounted: the server renders no browser.
      isChromium: false,
      // The control bar: how wide it is, and how wide it was the last time its buttons
      // had their labels (see controlsCrowded).
      controlsWidth: 0,
      labeledControlsWidth: 0,
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
      chatRoomId: 'videoCall/chatRoomId',
      conferenceUnread: 'videoCall/conferenceUnread',
      groupChatUnread: 'videoCall/groupChatUnread',
      lastChatTab: 'videoCall/lastChatTab',
      reloadPending: 'videoCall/reloadPending',
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
    // Which of the call's two chats is open, if any: 'call' is the conference chat
    // only the participants share, 'group' the group's own.
    activeChatTab() {
      return activeCallChatTab(this.getShowChat, this)
    },
    chatOpenForThisCall() {
      return this.activeChatTab !== null
    },
    showChatSidebar() {
      // Embedded in the maximized call view. In the minimized/parked state the
      // chat continues to live in the chat-modul (layouts/default.vue). On a
      // phone the call is always full screen and the chat takes the place below
      // a single small tile (see mobileChatOpen).
      return this.phase === 'in-call' && this.chatOpenForThisCall && !this.parked
    },
    // On a phone there is no room for the chat beside the videos: it goes below,
    // and the stage shrinks to one small tile, the person speaking.
    mobileChatOpen() {
      return this.isMobile && this.showChatSidebar
    },
    // Whether the stage shows one tile only: in the parked window, and next to the
    // chat on a phone. The others stay mounted, so their sound keeps playing.
    singleTile() {
      return !this.isFullscreen || this.mobileChatOpen
    },
    soloTile() {
      return this.mobileChatOpen ? this.speakerTile : this.primaryTile
    },
    speakerTile() {
      // The camera of whoever spoke last — a face to go with the voice while one
      // reads and writes. Before anybody has spoken, what the parked window shows.
      const speaker = this.tiles.find(
        (t) => t.identity === this.lastRemoteSpeakerId && !t.isScreen && !t.isLocal,
      )
      return speaker || this.primaryTile
    },
    // What the chat on screen is, said once above its messages: who reads along, and
    // whether it notifies — the same as the hint on its tab.
    chatHint() {
      if (this.activeChatTab === 'call') return this.$t('videoCall.chatTabs.callHint')
      if (this.activeChatTab === 'group') return this.$t('videoCall.chatTabs.groupHint')
      return null
    },
    chatButtonUnread() {
      // Both of the call's chats, added up — less the one on screen, which has nothing
      // left to point at.
      const call = this.activeChatTab === 'call' ? 0 : this.conferenceUnread
      const group = this.activeChatTab === 'group' ? 0 : this.groupChatUnread
      return call + group
    },
    // The controls say on them what they are about; whether it is on, their icon and
    // colour say. What a click does — for which device — the tooltip and a screen reader
    // say (the …Action ones).
    micLabel() {
      return this.$t('videoCall.controls.microphone')
    },
    micAction() {
      const device = this.deviceNames.mic || this.micLabel
      return this.micEnabled
        ? this.$t('videoCall.controls.turnOff', { device })
        : this.$t('videoCall.controls.turnOn', { device })
    },
    cameraLabel() {
      return this.$t('videoCall.controls.camera')
    },
    cameraAction() {
      const device = this.deviceNames.camera || this.cameraLabel
      return this.cameraEnabled
        ? this.$t('videoCall.controls.turnOff', { device })
        : this.$t('videoCall.controls.turnOn', { device })
    },
    screenShareLabel() {
      return this.$t('videoCall.controls.screen')
    },
    screenShareAction() {
      if (!this.screenShareEnabled) return this.$t('videoCall.controls.startSharing')
      // What is shared, as far as the browser tells: the screen, a window or a tab. Not
      // their title — Chrome names them `window:12345:0`.
      // Each key spelled out, so the check for unused translations sees it used.
      const surfaces = {
        window: () => this.$t('videoCall.controls.surface.window'),
        browser: () => this.$t('videoCall.controls.surface.browser'),
      }
      const surface = (
        surfaces[this.screenShareSurface] || (() => this.$t('videoCall.controls.surface.monitor'))
      )()
      return this.$t('videoCall.controls.stopSharing', { surface })
    },
    deviceSettingsLabel() {
      return this.$t('videoCall.deviceSettings.button')
    },
    deviceNames() {
      // Without a known device the browser uses its default, which it lists
      // first — the same reading the device settings show as selected.
      const name = (kind, deviceId) => {
        const ofKind = this.knownDevices.filter((d) => d.kind === kind)
        const device = ofKind.find((d) => d.deviceId === deviceId) || ofKind[0]
        return (device && device.label) || ''
      }
      return {
        camera: name('videoinput', this.cameraDeviceId),
        mic: name('audioinput', this.micDeviceId),
        speaker: name('audiooutput', this.speakerDeviceId),
      }
    },
    deviceSettingsTooltip() {
      // The open panel sits right where the tooltip would, and says it all.
      if (this.showDeviceSettings) return ''
      const names = this.deviceNames
      const details = [
        ['camera', 'videoCall.prejoin.camera'],
        ['mic', 'videoCall.prejoin.microphone'],
        ['speaker', 'videoCall.prejoin.speaker'],
      ]
        .filter(([device]) => names[device])
        .map(([device, key]) => `${this.$t(key)}: ${names[device]}`)
      return this.deviceTooltip(this.deviceSettingsLabel, details)
    },
    chatLabel() {
      return this.$t('videoCall.controls.chat')
    },
    chatAction() {
      return this.chatOpenForThisCall
        ? this.$t('videoCall.closeChat')
        : this.$t('videoCall.openChat')
    },
    leaveLabel() {
      return this.$t('videoCall.controls.leave')
    },
    leaveAction() {
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
    // On a phone the maximized call fills the screen: its header and control bar lie on the
    // videos, as the page's header does, see-through, and they move out of the way after a
    // while without a touch, or at a tap. Not with the chat open, where one writes beneath
    // a small tile.
    barsOverlay() {
      return this.isFullscreen && this.isMobile && !this.mobileChatOpen
    },
    // On a desktop the bars of the maximized call — the page's header and footer, the
    // call's header and control bar — stand around the videos, solid, and move only when
    // asked to, with a button: a mouse moved by chance would bring them in, and together
    // they are high.
    barsManual() {
      return this.isFullscreen && !this.isMobile && this.phase === 'in-call' && !this.error
    },
    // Only once there are videos to make room for.
    autoHideBars() {
      return this.barsOverlay && this.phase === 'in-call' && !this.error
    },
    // What the page's header and footer do meanwhile (layouts/default.vue).
    pageBars() {
      if (this.barsOverlay) return this.barsHidden ? 'hidden' : 'overlay'
      if (this.barsManual) return this.barsCollapsed ? 'collapsed' : 'manual'
      return 'normal'
    },
    modeClass() {
      if (this.isPreJoinModal) return 'video-call--modal'
      return this.isFullscreen ? 'video-call--maximized' : 'video-call--minimized'
    },
    onCallRoute() {
      return this.$route.name === 'call-id-slug'
    },
    parked() {
      // The call sits in the corner as a small window: during an active call —
      // not during the prejoin modal — and never on a phone, where the call is
      // always full screen.
      return this.phase === 'in-call' && this.minimized && !this.isMobile
    },
    iconOnly() {
      // Buttons without their label where there is no room for it: in the parked
      // window, on a phone, where six spelled-out controls fill half the
      // screen, and where the labels would take a second row. In the parked window
      // they are small as well (see `parked`); on a phone they keep the size a
      // finger needs.
      return this.parked || (this.isMobile && this.phase === 'in-call') || this.controlsCrowded
    },
    // The control bar lies on the videos only, so the chat beside them narrows it.
    controlsCrowded() {
      return (
        !this.isMobile &&
        this.controlsWidth > 0 &&
        this.labeledControlsWidth > 0 &&
        this.controlsWidth < this.labeledControlsWidth
      )
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
      if (this.singleTile) return 'video-call__single'
      return this.spotlightTile ? 'video-call__stage--spotlight' : 'video-call__grid'
    },
    gridStyleConditional() {
      // The grid template only applies for the regular grid view. Spotlight
      // and single (minimized, or beside the chat on a phone) modes have their
      // own static layouts.
      if (this.spotlightTile || this.singleTile) return null
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
    // Once, when it arrives; the notice above stays for as long as it waits.
    reloadPending(pending) {
      if (pending) this.$toast.info(this.$t('videoCall.reloadPending'))
    },
    show: {
      immediate: true,
      handler(open, wasOpen) {
        if (open) {
          this.phase = 'prejoin'
          this.error = null
          this.barsCollapsed = false
          this.prefetchJoin()
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
    pageBars: {
      immediate: true,
      handler(pageBars) {
        this.setPageBars(pageBars)
      },
    },
    autoHideBars: {
      immediate: true,
      handler(on) {
        this.watchBarActivity(on)
      },
    },
    activeSpeakerIds(ids) {
      const remote = ids.find((id) => this.tiles.some((t) => t.identity === id && !t.isLocal))
      if (remote) this.lastRemoteSpeakerId = remote
    },
    // Where the chat button opens next time: the tab looked at last. Only while there is
    // a choice — without a conference chat the group's is all there is, which says nothing
    // about what the user would pick.
    activeChatTab(tab, previous) {
      // Another chat on screen: what was known of the conference chat's messages is the
      // instance's that is gone; the new one reports again.
      if (tab !== previous) this.callChatEmpty = false
      if (tab && this.chatRoomId) this.setLastChatTab(tab)
    },
    chatRoomId(next, previous) {
      // An open conference chat follows the call: to the room of the call the
      // client is in now (it can change when a lost connection comes back into a
      // call opened anew), and away with it when the call is left.
      if (previous && this.getShowChat.showChat && this.getShowChat.roomId === previous) {
        this.setShowChat({ showChat: !!next, chatUserId: null, groupId: null, roomId: next })
      }
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
      // leave() navigates away from the call URL before it hangs up. That is
      // no reason to park the window for the moment the hanging up takes.
      if (this.leaving) return
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
  beforeCreate() {
    // Set before the immediate `show` watcher runs — it does so ahead of
    // created() and may already store a prefetched join token here.
    this.prefetched = null
    // Ahead of the immediate `autoHideBars` watcher as well.
    this.barsTimer = null
    this.barsWatched = false
    this.lastTouchAt = 0
    // The tap that brought the bars back is not meant for the tile it landed on.
    this.swallowTileSelect = false
  },
  created() {
    this.icons = iconRegistry
    // Non-reactive bookkeeping: identity -> timestamp of the last report from
    // LiveKit. Insertion order doubles as a stable display order, so a speaker
    // who keeps talking never jumps around the chip row.
    this.speakerSeenAt = new Map()
    this.speakerHoldTimer = null
    this.micRestart = null
    this.micSilenceProbe = null
    this.stageObserver = null
    this.observedStage = null
    this.qualityTimer = null
    this.qualityClass = null
    this.leaving = false
    this.deviceSwitches = this.newDeviceSwitches()
    this.callChatsSub = null
    this.groupChatRoomId = null
    this.callChatRetryTimer = null
  },
  mounted() {
    this.isChromium = typeof navigator !== 'undefined' && !!navigator.userAgentData
    this.observeStage()
  },
  updated() {
    // The stage only exists in some phases, so re-check after every render
    // rather than wiring this up once. observeStage() bails out when the
    // element is unchanged, which also keeps the observer's own updates from
    // looping.
    this.observeStage()
    this.measureControls()
  },
  beforeDestroy() {
    this.watchBarActivity(false)
    this.setPageBars('normal')
    this.disconnectStageObserver()
    this.closeDeviceSettings()
    this.cleanup()
    this.watchCallChats(false)
  },
  methods: {
    ...mapMutations({
      setMinimized: 'videoCall/SET_MINIMIZED',
      close: 'videoCall/CLOSE',
      setParticipantCount: 'videoCall/SET_PARTICIPANT_COUNT',
      setStorePhase: 'videoCall/SET_PHASE',
      setChatRoomId: 'videoCall/SET_CHAT_ROOM_ID',
      setConferenceUnread: 'videoCall/SET_CONFERENCE_UNREAD',
      setGroupChatUnread: 'videoCall/SET_GROUP_CHAT_UNREAD',
      setLastChatTab: 'videoCall/SET_LAST_CHAT_TAB',
      setPageBars: 'videoCall/SET_PAGE_BARS',
      setShowChat: 'chat/SET_OPEN_CHAT',
    }),
    watchBarActivity(on) {
      if (typeof document === 'undefined' || on === this.barsWatched) return
      this.barsWatched = on
      const method = on ? 'addEventListener' : 'removeEventListener'
      BARS_ACTIVITY_EVENTS.forEach((type) =>
        document[method](type, this.onBarActivity, { capture: true, passive: true }),
      )
      if (on) {
        this.scheduleBarsHide()
      } else {
        clearTimeout(this.barsTimer)
        this.barsTimer = null
        this.barsHidden = false
      }
    },
    onBarActivity(event) {
      if (event.type === 'pointerdown' && event.pointerType === 'touch') {
        this.onBarTouch(event)
        return
      }
      if (Date.now() - this.lastTouchAt < TOUCH_ECHO_MS) return
      // Reading and writing in the chat beside the videos is no reason to put the bars
      // back on them; going for the page's header or footer at the window's edge is.
      const inChat = event.target?.closest?.('.video-call__sidebar')
      const atEdge =
        typeof event.clientY === 'number' &&
        (event.clientY < BARS_EDGE_PX || event.clientY > window.innerHeight - BARS_EDGE_PX)
      if (inChat && !atEdge) return
      this.barsHidden = false
      this.scheduleBarsHide()
    },
    // On a touch screen a tap on the videos switches the bars: back when they are gone —
    // without spotlighting the tile it landed on — and away when they are there, unless
    // the tap is on a tile, which spotlights it as ever. Other taps keep them a while.
    onBarTouch(event) {
      this.lastTouchAt = Date.now()
      this.swallowTileSelect = false
      const onStage = event.target?.closest?.('.video-call__stage')
      if (this.barsHidden) {
        this.barsHidden = false
        this.swallowTileSelect = !!onStage
        this.scheduleBarsHide()
      } else if (onStage && !event.target.closest('.video-tile')) {
        clearTimeout(this.barsTimer)
        this.barsHidden = true
      } else {
        this.scheduleBarsHide()
      }
    },
    scheduleBarsHide() {
      clearTimeout(this.barsTimer)
      this.barsTimer = setTimeout(this.hideBarsUnlessInUse, BARS_HIDE_MS)
    },
    hideBarsUnlessInUse() {
      if (this.barsInUse()) this.scheduleBarsHide()
      else this.barsHidden = true
    },
    // Nothing moves away from under the mouse, from the keyboard's focus or from beneath
    // a menu it opened.
    barsInUse() {
      if (this.showDeviceSettings) return true
      const bars = [
        this.$el?.querySelector?.('.video-call__header'),
        this.$el?.querySelector?.('.video-call__controls'),
        document.querySelector('.main-navigation'),
        document.querySelector('.desktop-footer'),
      ].filter(Boolean)
      const focused = document.activeElement
      const keyboardFocus = focused && matchesSafely(focused, ':focus-visible')
      // A touch screen keeps the last tapped element as hovered; that says nothing there.
      const hovers = window.matchMedia?.('(hover: hover)')?.matches ?? true
      if (
        bars.some(
          (bar) =>
            (hovers && matchesSafely(bar, ':hover')) || (keyboardFocus && bar.contains(focused)),
        )
      ) {
        return true
      }
      // The page's menu on a phone covers the screen from its header.
      if (document.querySelector('.mobil-header-box--open')) return true
      // The menus of the page's header (avatar, notifications) are popovers, put at the
      // end of the page.
      return !!document.querySelector('.popover[aria-hidden="false"]')
    },
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
    // How wide the control bar is, and — while its buttons have their labels — how wide
    // they need it in one row. Run after every render: the bar changes with the stage
    // (whose observer re-renders) and with the labels (muted or not).
    measureControls() {
      const bar = this.$el?.querySelector?.('.video-call__controls')
      if (!bar) return
      if (bar.clientWidth !== this.controlsWidth) this.controlsWidth = bar.clientWidth
      if (this.iconOnly) return
      const style = window.getComputedStyle(bar)
      const items = Array.from(bar.children)
      const needed = Math.ceil(
        items.reduce((sum, item) => sum + item.offsetWidth, 0) +
          (parseFloat(style.columnGap) || 0) * Math.max(items.length - 1, 0) +
          (parseFloat(style.paddingLeft) || 0) +
          (parseFloat(style.paddingRight) || 0),
      )
      if (needed !== this.labeledControlsWidth) this.labeledControlsWidth = needed
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
      if (this.chatOpenForThisCall) {
        this.setShowChat({ showChat: false, chatUserId: null, groupId: null })
        return
      }
      // Where it was left: the tab looked at last, which starts out as the call's own
      // chat — the one that disturbs nobody outside the call. Without a conference chat
      // (see joinCallChat) either choice opens the group's chat.
      this.selectChatTab(this.lastChatTab)
      // Chat renders inside the call sidebar when maximized, or in the
      // chat-modul (layouts/default.vue) when the call is parked. Either
      // way no navigation is needed.
    },
    closeInCallChat() {
      this.setShowChat({ showChat: false, chatUserId: null, groupId: null })
    },
    // The export is the chat's own doing (it knows the room and fetches every message);
    // only its button sits here, in the tab row.
    async exportCallChat() {
      const chat = this.$refs.inCallChat
      if (!chat || this.chatExporting) return
      this.chatExporting = true
      try {
        await chat.exportRoom()
      } finally {
        this.chatExporting = false
      }
    },
    onChatEmptyChange(empty) {
      // Only the conference chat's emptiness bears on its download.
      if (this.activeChatTab === 'call') this.callChatEmpty = empty
    },
    selectChatTab(tab) {
      this.setShowChat(callChatTarget(tab, this))
    },
    // The conference chat is for those IN the call, so the server is asked for it
    // only now that the client is connected — it checks that with the media
    // server. A failure costs the conference chat, never the call: the chat
    // button then opens the group's chat, as it did before there was another.
    async joinCallChat(room, attempt = 1) {
      const groupId = this.groupId
      try {
        const { data } = await this.$apollo.mutate({
          mutation: joinGroupVideoCallChatMutation(),
          variables: { groupId },
        })
        // The call may have been left, or swapped for another, in the meantime.
        if (this.room !== room || this.groupId !== groupId) return
        this.setChatRoomId((data && data.joinGroupVideoCallChat) || null)
      } catch (_e) {
        if (this.room !== room || this.groupId !== groupId) return
        // The media server can take a moment to list a participant it just let in.
        if (attempt < CALL_CHAT_JOIN_ATTEMPTS) {
          // Kept, so leaving the call can call it off (see cleanup): hanging up takes a
          // moment during which `this.room` is still the room, and a retry due just then
          // would ask for the chat of a call that is being left.
          this.cancelCallChatRetry()
          this.callChatRetryTimer = setTimeout(() => {
            this.callChatRetryTimer = null
            if (this.room === room) this.joinCallChat(room, attempt + 1)
          }, CALL_CHAT_JOIN_RETRY_MS)
        }
      }
    },
    cancelCallChatRetry() {
      if (!this.callChatRetryTimer) return
      clearTimeout(this.callChatRetryTimer)
      this.callChatRetryTimer = null
    },
    // The unread counts of the call's two chats, for their tabs: one subscription for the
    // length of the call, sorted by room below.
    watchCallChats(active) {
      if (this.callChatsSub) {
        this.callChatsSub.unsubscribe()
        this.callChatsSub = null
      }
      if (!active) return
      // The counts are a convenience: whatever goes wrong here, at once or later, must not
      // touch the call this runs in. The chat itself reports its own errors.
      try {
        this.callChatsSub = this.$apollo
          .subscribe({ query: roomUpdated(), fetchPolicy: 'no-cache' })
          .subscribe({
            next: ({ data }) => this.onCallChatUpdated(data && data.roomUpdated),
            error: () => {},
          })
      } catch (_e) {
        this.callChatsSub = null
      }
    },
    onCallChatUpdated(room) {
      if (!room) return
      if (this.chatRoomId && room.id === this.chatRoomId) {
        this.setConferenceUnread(room.unreadCount)
      } else if (this.groupChatRoomId && room.id === this.groupChatRoomId) {
        this.setGroupChatUnread(room.unreadCount)
      } else if (!this.groupChatRoomId) {
        // The group's chat room is not known yet. It may not have existed when the call
        // began, and this may be the message that brought it about — ask again.
        this.loadGroupChatUnread()
      }
    },
    // The room of the group's chat and what is unread in it. The room is asked for by the
    // group, as it need not exist; updates then arrive by its id.
    async loadGroupChatUnread() {
      const groupId = this.groupId
      try {
        const { data } = await this.$apollo.query({
          query: roomUnreadQuery(),
          variables: { groupId },
          fetchPolicy: 'network-only',
        })
        // The call may have been left, or swapped for another, in the meantime.
        if (this.groupId !== groupId || this.phase !== 'in-call') return
        const room = data && data.Room && data.Room[0]
        this.groupChatRoomId = room ? room.id : null
        this.setGroupChatUnread(room ? room.unreadCount : 0)
      } catch (_e) {
        /* the tab simply goes without a count */
      }
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
    deviceTooltip(label, details) {
      // Names the device(s) behind a button on hover — below the button's own
      // label where that is not spelled out next to the icon already.
      const lines = [this.iconOnlyTooltip(label), ...details].filter(Boolean)
      if (!lines.length) return ''
      // Plain text: a device name comes from outside and must not be read as
      // markup, which is what v-tooltip does with its content by default.
      return { content: lines.join('\n'), html: false, classes: 'tooltip--multiline' }
    },
    async refreshKnownDevices() {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.enumerateDevices
      ) {
        return
      }
      const room = this.room
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        // The call may have ended while the browser was listing.
        if (this.room !== room) return
        this.knownDevices = devices.map(({ kind, deviceId, label }) => ({ kind, deviceId, label }))
      } catch (_e) {
        /* the buttons simply go without device names */
      }
    },
    // The tooltip of a control: what a click on it does. Plain text, as it may carry a
    // device's name, which comes from outside. None on a phone (see iconOnlyTooltip).
    controlTooltip(action) {
      if (this.isMobile || !action) return ''
      return { content: action, html: false }
    },
    iconOnlyTooltip(label) {
      // v-tooltip renders nothing for an empty string — exactly what we want
      // once the button spells its label out next to the icon. Nor on a phone:
      // there is no pointer to hover with, and a tap would open the tooltip on
      // top of doing what the button does.
      return this.parked || this.controlsCrowded ? label : ''
    },
    onTileSelect(tile) {
      if (this.swallowTileSelect) {
        this.swallowTileSelect = false
        return
      }
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
      this.audioBlocked = false
      this.micProblem = false
      this.reconnecting = false
      // A restart still running belongs to the previous attempt's room — retryConnect()
      // tears that down without cleanup(), so let go of it here for every way in.
      this.micRestart = null
      this.micSilenceProbe = null
      this.resetAudioOnly()
      try {
        if (!this.groupId) throw new Error('Missing group id')
        const payload = await this.takeJoinPayload(this.groupId)

        const livekit = await import('livekit-client')
        const { Room, RoomEvent, Track, TrackEvent, DisconnectReason } = livekit
        this.Track = Track

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: this.cameraDeviceId ? { deviceId: this.cameraDeviceId } : {},
          audioCaptureDefaults: this.micDeviceId ? { deviceId: this.micDeviceId } : {},
          // LiveKit picks the speaker anew whenever a device comes or goes.
          // Unless it knows ours, that puts everyone back on the system
          // default without a word.
          ...(this.speakerDeviceId ? { audioOutput: { deviceId: this.speakerDeviceId } } : {}),
        })
        this.room = room

        const onAny = () => this.refreshTiles()
        room.on(RoomEvent.ParticipantConnected, onAny)
        room.on(RoomEvent.ParticipantDisconnected, onAny)
        room.on(RoomEvent.TrackSubscribed, () => {
          // Subscribed before the unsubscribe of audio-only mode took hold.
          if (this.audioOnly) this.applyAudioOnly()
          onAny()
        })
        // A camera published while we are in audio-only mode would otherwise
        // be auto-subscribed and eat the bandwidth we just freed.
        room.on(RoomEvent.TrackPublished, () => {
          if (this.audioOnly) this.applyAudioOnly()
        })
        // Every tile shows a warning while its owner's connection is weak, our
        // own included — which tells at a glance whose line is the problem.
        room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          if (participant === room.localParticipant) this.onLocalConnectionQuality(quality)
          onAny()
        })
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
          // The server hears us speak: whatever the check of the capture says
          // — in Firefox it can read silence off a microphone that works —
          // the others hear us as well.
          if ((speakers || []).includes(room.localParticipant)) this.micHeard()
        })
        room.on(RoomEvent.LocalTrackPublished, (pub) => {
          this.screenShareEnabled = !!room.localParticipant.isScreenShareEnabled
          if (pub && pub.source === Track.Source.Microphone && pub.track) {
            this.watchMicTrack(pub.track, TrackEvent)
          }
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

        // LiveKit plays remote audio through the <audio> elements the tiles
        // attach. When the browser's autoplay policy rejects play() — Safari
        // does so whenever the page itself is not capturing, and any browser
        // once the click that started the call is too long ago — the call
        // carries on with video only and nothing tells the user. Mirror the
        // state so the template can offer the gesture that unblocks it.
        room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          this.audioBlocked = !room.canPlaybackAudio
        })
        // A full reconnect re-subscribes every remote track as a new object.
        // Rebuild the tiles so each <audio> element gets the live one, and
        // re-read the playback state: the re-attach runs play() again, outside
        // any user gesture.
        room.on(RoomEvent.Reconnecting, () => {
          this.reconnecting = true
        })
        room.on(RoomEvent.Reconnected, () => {
          this.reconnecting = false
          this.refreshTiles()
          this.audioBlocked = !room.canPlaybackAudio
          // Back in — possibly in a call opened anew meanwhile, with a chat of its own.
          this.joinCallChat(room)
        })
        // A device came or went (headset plugged in, AirPods reconnected).
        // LiveKit already follows the system default; if our microphone was
        // dead, this is the moment a fresh capture has a chance to work.
        room.on(RoomEvent.MediaDevicesChanged, () => {
          if (this.micProblem) this.restartMic()
          this.refreshKnownDevices()
        })
        // LiveKit moved to another device — because we asked for it, or on its
        // own once the one in use was unplugged.
        room.on(RoomEvent.ActiveDeviceChanged, (kind, deviceId) => {
          if (!DEVICE_FIELDS[kind] || !deviceId) return
          this[DEVICE_FIELDS[kind]] = deviceId
          if (kind === 'audioinput') this.refreshMicMeter()
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
        this.audioBlocked = !room.canPlaybackAudio
        this.phase = 'in-call'
        this.joinCallChat(room)
        this.watchCallChats(true)
        this.loadGroupChatUnread()
        this.refreshKnownDevices()
      } catch (err) {
        const message = this.$backendError(err)
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
          // ResponsiveImage (used by AvatarImage) expects url + responsive
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
        const micEnabled = !!participant.isMicrophoneEnabled
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
        // Camera and mic share a single tile/key regardless of whether the camera is
        // currently on — the avatar fallback covers the no-video case. Giving the
        // no-video and camera-on states different keys used to force Vue to destroy
        // and recreate the tile (and with it the <audio> element) on every camera
        // toggle, which could leave the participant silent until the next toggle
        // happened to re-attach successfully.
        tiles.push({
          key: `${participant.identity}/main`,
          identity: participant.identity,
          name: participant.name || participant.identity,
          profile,
          videoTrack: cameraPub ? cameraPub.track : null,
          audioTrack,
          isLocal,
          isScreen: false,
          micEnabled,
          connectionQuality: participant.connectionQuality || 'unknown',
        })
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
    toggleDeviceSettings() {
      if (this.showDeviceSettings) this.closeDeviceSettings()
      else this.openDeviceSettings()
    },
    openDeviceSettings() {
      this.showDeviceSettings = true
      this.refreshMicMeter()
      // Capture phase: a click that something else swallows still closes the
      // panel.
      document.addEventListener('click', this.onDocumentClick, true)
      document.addEventListener('keydown', this.onDocumentKeydown)
    },
    closeDeviceSettings({ restoreFocus = false } = {}) {
      document.removeEventListener('click', this.onDocumentClick, true)
      document.removeEventListener('keydown', this.onDocumentKeydown)
      this.showDeviceSettings = false
      this.micMeterStream = null
      if (!restoreFocus) return
      const toggle = this.$refs.deviceSettingsToggle
      const el = toggle && toggle.$el
      if (el && typeof el.focus === 'function') el.focus()
    },
    onDocumentClick(event) {
      const el = this.$refs.deviceSettingsEl
      if (el && el.contains(event.target)) return
      this.closeDeviceSettings()
    },
    onDocumentKeydown(event) {
      if (event.key === 'Escape') this.closeDeviceSettings({ restoreFocus: true })
    },
    localMicTrack() {
      const room = this.room
      const Track = this.Track
      if (!room || !Track) return null
      const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
      return (pub && pub.track) || null
    },
    refreshMicMeter() {
      if (!this.showDeviceSettings) return
      const track = this.localMicTrack()
      const mediaTrack = track && track.mediaStreamTrack
      // A muted microphone has no level worth showing.
      this.micMeterStream =
        this.micEnabled && mediaTrack && typeof MediaStream !== 'undefined'
          ? new MediaStream([mediaTrack])
          : null
    },
    async switchDevice({ kind, deviceId, label }) {
      const room = this.room
      const field = DEVICE_FIELDS[kind]
      if (!room || !field || !deviceId || this[field] === deviceId) return
      // The user may pick again before this switch is through. Per kind, only
      // the latest pick owns the selection; and what to go back to after a
      // refusal is the device that ran before any switch still on its way —
      // not the selection as it is right now, which may be an earlier pick
      // that has yet to prove itself.
      const switching = this.deviceSwitches[kind]
      const ticket = ++switching.latest
      if (switching.inFlight === 0) switching.settled = this[field]
      switching.inFlight++
      // Shown as selected at once; taken back below if the device refuses.
      this[field] = deviceId
      // A capture that is switched off right now is noted by LiveKit and used
      // the next time it is turned on.
      this.deviceStarts(kind)
      // One switch of a kind at a time, in the order they were asked for.
      // Handed to LiveKit side by side, an earlier one can finish after a later
      // one and leave its device behind — or be answered "not switched" for no
      // other reason than the later one having changed the target meanwhile.
      const turn = switching.queue
      let done
      switching.queue = new Promise((resolve) => {
        done = resolve
      })
      try {
        await turn
        // The call ended, or a newer pick came in, while this one was waiting
        // its turn: there is nothing left for it to start.
        if (this.room !== room || ticket !== switching.latest) return
        // false: the capture was restarted, but not on the device asked for.
        if ((await room.switchActiveDevice(kind, deviceId)) === false) {
          throw new Error('Device not switched')
        }
      } catch (err) {
        if (this.room !== room) return
        this.showSwitchErrorToast(kind, err)
        // Overtaken by a newer pick: the selection and LiveKit are that one's
        // business now. Taking them back here would undo it.
        if (ticket !== switching.latest) return
        const settled = switching.settled
        this[field] = settled
        // LiveKit stops the running capture before it opens the new one, so a
        // refused switch leaves none — go back to the one that worked.
        if (settled) {
          try {
            await room.switchActiveDevice(kind, settled)
          } catch (_e) {
            /* the toast above already says the device is in trouble */
          }
        }
        return
      } finally {
        switching.inFlight--
        this.deviceStarted(kind)
        done()
      }
      if (this.room !== room) return
      switching.settled = deviceId
      saveDevicePreference(kind, { deviceId, label })
      if (kind === 'videoinput') this.refreshTiles()
      if (kind === 'audioinput') {
        this.refreshMicMeter()
        await this.recheckMicProblem(room)
      }
    },
    newDeviceSwitches() {
      const none = () => ({ latest: 0, inFlight: 0, settled: null, queue: Promise.resolve() })
      return { videoinput: none(), audioinput: none(), audiooutput: none() }
    },
    deviceStarts(kind) {
      this.devicesStarting[kind]++
    },
    deviceStarted(kind) {
      // Not below zero: the call may have ended, and been cleaned up, while
      // the device was still on its way.
      this.devicesStarting[kind] = Math.max(0, this.devicesStarting[kind] - 1)
    },
    isOwnCameraTile(tile) {
      return tile.isLocal && !tile.isScreen
    },
    showSwitchErrorToast(kind, err) {
      if (kind !== 'audiooutput') {
        this.showDeviceErrorToast(kind === 'videoinput' ? 'camera' : 'mic', err)
        return
      }
      if (this.$toast && typeof this.$toast.error === 'function') {
        this.$toast.error(this.$t('videoCall.deviceSettings.speakerError'))
      }
    },
    async recheckMicProblem(room) {
      // LiveKit reports a new microphone that is silent, but not one that
      // works — without this the warning about the old one would stay. A check
      // still running on the old one starts over, too: its patience was spent
      // on a capture that is gone.
      if (!this.micEnabled) return
      const track = this.localMicTrack()
      if (!track || !(this.micProblem || this.isProbingMicSilence(track))) return
      const silent = await this.micStaysSilent(track)
      if (this.room === room) this.micProblem = this.micEnabled && silent
    },
    isProbingMicSilence(track) {
      return !!this.micSilenceProbe && this.micSilenceProbe.track === track
    },
    micStaysSilent(track) {
      // One check per track at a time. Whoever asks while it runs just changed
      // the capture (a restart, another device) or wants the same answer: the
      // check starts counting anew and they all get its outcome.
      const running = this.micSilenceProbe
      if (running && running.track === track) {
        running.left = MIC_SILENCE_RECHECKS
        running.heard = false
        return running.promise
      }
      const probe = { track, left: MIC_SILENCE_RECHECKS, heard: false }
      // Known as running before its first check, which may report at once.
      this.micSilenceProbe = probe
      probe.promise = this.probeMicSilence(probe).finally(() => {
        if (this.micSilenceProbe === probe) this.micSilenceProbe = null
      })
      return probe.promise
    },
    async probeMicSilence(probe) {
      try {
        while (await probe.track.checkForSilence()) {
          if (probe.heard) return false
          if (probe.left-- <= 0) return true
          await this.micSilencePause()
          // Muted, unpublished or the call over: no silence left to report.
          if (!this.micEnabled || this.localMicTrack() !== probe.track) return false
        }
      } catch (_e) {
        /* the capture could not be read: no silence to be told of */
      }
      return false
    },
    micHeard() {
      // Also settles a check still running, which would otherwise bring the
      // warning right back.
      if (this.micSilenceProbe) this.micSilenceProbe.heard = true
      this.micProblem = false
    },
    micSilencePause() {
      return new Promise((resolve) => setTimeout(resolve, MIC_SILENCE_RECHECK_MS))
    },
    prefetchJoin() {
      const groupId = this.groupId
      if (!groupId) return
      const promise = (async () => {
        // Loads the client library chunk as well, the other half of the wait.
        await import('livekit-client')
        return this.fetchJoinPayload(groupId)
      })()
      // A failure here is not the user's business yet: connect() asks again
      // and reports whatever the real attempt runs into.
      promise.catch(() => {})
      this.prefetched = { groupId, requestedAt: Date.now(), promise }
    },
    async takeJoinPayload(groupId) {
      const prefetched = this.prefetched
      // A token is good for one join; a retry has to ask for a new one.
      this.prefetched = null
      if (
        prefetched &&
        prefetched.groupId === groupId &&
        Date.now() - prefetched.requestedAt < PREFETCHED_TOKEN_MAX_AGE_MS
      ) {
        try {
          return await prefetched.promise
        } catch (_e) {
          /* fall through to a fresh request */
        }
      }
      return this.fetchJoinPayload(groupId)
    },
    async fetchJoinPayload(groupId) {
      const { data } = await this.$apollo.mutate({
        mutation: joinGroupVideoCallMutation(),
        variables: { groupId },
      })
      const payload = data && data.joinGroupVideoCall
      if (!payload) throw new Error('No token returned')
      return payload
    },
    onLocalConnectionQuality(quality) {
      // LiveKit reports every change, so a shaky line flips between poor and
      // lost (or good and excellent) well within the grace periods. Only a
      // change of class restarts the clock — otherwise it never runs out.
      const qualityClass = WEAK_QUALITIES.includes(quality)
        ? 'weak'
        : STRONG_QUALITIES.includes(quality)
          ? 'strong'
          : 'unknown'
      if (qualityClass === this.qualityClass) return
      this.qualityClass = qualityClass
      this.clearQualityTimer()
      if (WEAK_QUALITIES.includes(quality) && !this.audioOnly && !this.audioOnlyDismissed) {
        this.qualityTimer = setTimeout(() => this.setAudioOnly(true), WEAK_CONNECTION_MS)
      } else if (STRONG_QUALITIES.includes(quality) && this.audioOnly) {
        this.qualityTimer = setTimeout(() => this.setAudioOnly(false), RECOVERED_CONNECTION_MS)
      }
    },
    clearQualityTimer() {
      if (this.qualityTimer) {
        clearTimeout(this.qualityTimer)
        this.qualityTimer = null
      }
    },
    setAudioOnly(on) {
      this.qualityTimer = null
      this.audioOnly = on
      this.applyAudioOnly()
    },
    applyAudioOnly() {
      const room = this.room
      const Track = this.Track
      if (!room || !Track) return
      // Unsubscribing (rather than setEnabled(false)) hands the track back to
      // adaptiveStream untouched once it is subscribed again. Screen shares
      // stay: they are usually what the call is about, and mostly static.
      // setSubscribed() signals the server on every call, changed or not, and
      // this runs on each published/subscribed track — so only touch the ones
      // whose wish actually differs, sparing a weak line the chatter.
      const wanted = !this.audioOnly
      for (const participant of room.remoteParticipants.values()) {
        for (const pub of participant.videoTrackPublications.values()) {
          if (pub.source === Track.Source.Camera && pub.isDesired !== wanted) {
            pub.setSubscribed(wanted)
          }
        }
      }
      this.refreshTiles()
    },
    showVideos() {
      this.clearQualityTimer()
      this.audioOnlyDismissed = true
      this.setAudioOnly(false)
    },
    resetAudioOnly() {
      this.clearQualityTimer()
      this.qualityClass = null
      this.audioOnly = false
      this.audioOnlyDismissed = false
    },
    watchMicTrack(track, TrackEvent) {
      // When the OS takes the microphone away (another app, a Bluetooth profile
      // switch, macOS muting the capture) the MediaStreamTrack fires `mute`
      // and LiveKit stops sending after a few seconds — while the participant
      // still counts as "microphone enabled", so our button keeps saying the
      // mic is on and nobody hears a thing.
      track.on(TrackEvent.UpstreamPaused, () => {
        if (this.micEnabled) this.micProblem = true
      })
      track.on(TrackEvent.UpstreamResumed, () => {
        this.micProblem = false
      })
      // LiveKit checks the track for pure digital silence right after
      // publishing and after every restart — on macOS typically a browser that
      // lacks the system's microphone permission, or a device held by another
      // app. Listening on the track rather than the room keeps a silent
      // screen-share audio track from raising a microphone warning.
      //
      // That check comes 200 ms after the capture started, too early to tell a
      // dead microphone from one that is still starting up — so it only makes
      // us look closer. While we do, the event is our own checks reporting.
      track.on(TrackEvent.AudioSilenceDetected, async () => {
        if (!this.micEnabled || this.isProbingMicSilence(track)) return
        const silent = await this.micStaysSilent(track)
        if (silent && this.micEnabled && this.localMicTrack() === track) this.micProblem = true
      })
    },
    async enableAudio() {
      if (!this.room) return
      // Must run inside the click handler: startAudio() replays every attached
      // <audio> element and only counts as user-initiated from a gesture.
      try {
        await this.room.startAudio()
      } catch (_e) {
        /* still blocked — the notice stays and the user can try again */
      }
      this.audioBlocked = !this.room.canPlaybackAudio
    },
    restartMic() {
      // A click and a device change can ask at the same time; one fresh
      // capture is enough, so later callers share the running attempt.
      if (!this.micRestart) {
        const attempt = this.doRestartMic().finally(() => {
          // cleanup() may have let go of this attempt and a new call started
          // its own — don't release that one.
          if (this.micRestart === attempt) this.micRestart = null
        })
        this.micRestart = attempt
      }
      return this.micRestart
    },
    async doRestartMic() {
      const room = this.room
      const Track = this.Track
      if (!room || !Track) return
      const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
      const track = pub && pub.track
      if (!track) return
      try {
        // A fresh getUserMedia capture replaces the dead MediaStreamTrack on the
        // same publication; LiveKit resumes a paused upstream on its own, keeps
        // a muted track disabled and stops a track that was stopped meanwhile.
        await track.restartTrack()
        // The new capture can be just as silent as the old one — only drop the
        // warning once it is shown to deliver a signal.
        const silent = await this.micStaysSilent(track)
        // The call may have ended (or been retried) while we waited; its
        // outcome must not leak into the next one.
        if (this.room !== room) return
        this.micProblem = this.micEnabled && silent
        // The restart swapped the MediaStreamTrack under the publication.
        this.refreshMicMeter()
      } catch (err) {
        if (this.room === room) this.showDeviceErrorToast('mic', err)
      }
    },
    async toggleMic() {
      if (!this.room) return
      const next = !this.micEnabled
      if (next) this.deviceStarts('audioinput')
      try {
        await this.room.localParticipant.setMicrophoneEnabled(next)
        this.micEnabled = next
        // A muted microphone is silent on purpose.
        if (!next) this.micProblem = false
        this.refreshMicMeter()
        // The browser names its devices only once one was granted — which may
        // be just now.
        if (next) this.refreshKnownDevices()
      } catch (err) {
        // Re-sync from LiveKit — a partial failure (track published, then
        // permission revoked) can leave the real state out of sync with what
        // we'd otherwise leave in `this.micEnabled`.
        this.micEnabled = !!this.room.localParticipant.isMicrophoneEnabled
        this.showDeviceErrorToast('mic', err)
      } finally {
        if (next) this.deviceStarted('audioinput')
      }
    },
    async toggleCamera() {
      if (!this.room) return
      const next = !this.cameraEnabled
      if (next) this.deviceStarts('videoinput')
      try {
        await this.room.localParticipant.setCameraEnabled(next)
        this.cameraEnabled = next
        this.refreshTiles()
        if (next) this.refreshKnownDevices()
      } catch (err) {
        this.cameraEnabled = !!this.room.localParticipant.isCameraEnabled
        this.refreshTiles()
        this.showDeviceErrorToast('camera', err)
      } finally {
        if (next) this.deviceStarted('videoinput')
      }
    },
    async toggleScreenShare() {
      if (!this.room || !this.screenShareSupported) return
      const next = !this.screenShareEnabled
      try {
        const publication = await this.room.localParticipant.setScreenShareEnabled(next, {
          audio: true,
        })
        this.screenShareEnabled = next
        this.screenShareSurface = next
          ? publication?.track?.mediaStreamTrack?.getSettings?.().displaySurface || null
          : null
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
      this.leaving = true
      try {
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
      } finally {
        this.leaving = false
      }
    },
    async cleanup() {
      // First, before the disconnect below is awaited: nothing may ask for the call's chat
      // any more once the call is being left.
      this.cancelCallChatRetry()
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
      this.closeDeviceSettings()
      this.knownDevices = []
      this.devicesStarting = { videoinput: 0, audioinput: 0, audiooutput: 0 }
      this.deviceSwitches = this.newDeviceSwitches()
      this.tiles = []
      this.activeSpeakerIds = []
      this.spotlightKey = null
      this.micEnabled = true
      this.cameraEnabled = true
      this.screenShareEnabled = false
      this.audioBlocked = false
      this.micProblem = false
      this.reconnecting = false
      // A restart still running belongs to the room just torn down.
      this.micRestart = null
      this.micSilenceProbe = null
      this.resetAudioOnly()
      this.prefetched = null
      // The conference chat belongs to the call just left (see the chatRoomId watcher).
      this.setChatRoomId(null)
      this.watchCallChats(false)
      this.groupChatRoomId = null
      this.setGroupChatUnread(0)
      this.lastRemoteSpeakerId = null
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
  padding-top: var(--header-height);
  padding-bottom: var(--footer-height);
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
  /*  Rounded all round: it floats above the footer, not on the window's lower edge, and */
  /*  the rounded tile inside showed the window's square corner behind it. */
  border-radius: var(--border-radius-base);
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

@media (--vp-mobile) {
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

/*  The header itself — avatar, title, where its buttons go — is RoomHeader's. What is */
/*  the call's own are the things put into it. */
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

/*  On a phone the chat goes below the videos instead of beside them, and the stage */
/*  shrinks to one small tile — the person speaking — so the voice keeps a face */
/*  while the rest of the screen is for reading and writing. */
.video-call__body--chat-below {
  flex-direction: column;
}

.video-call__body--chat-below .video-call__stage {
  flex: 0 0 auto;
  height: 22vh;
  min-height: 110px;
}

.video-call__body--chat-below .video-call__sidebar {
  flex: 1 1 0;
  max-width: none;
  min-height: 0;
  border-left: 0;
  border-top: 1px solid var(--color-neutral-85);
}

/*  The notices sit at the bottom of the body, which is the chat here: keep them */
/*  on the videos. */
.video-call__body--chat-below .video-call__notices {
  top: var(--space-x-small);
  bottom: auto;
}

/*  The choice between the call's two chats sits above the chat, at its own height, */
/*  with the chat's buttons at its end. */
.video-call__sidebar > .video-call__chat-tabs {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--space-x-small);
  /*  No padding above and below: the tabs reach the row's lower edge, where the */
  /*  underline of the active one belongs. The buttons bring the row's height. */
  min-height: 36px;
  /*  The tabs start at the sidebar's edge, as in the floating chat window; the close */
  /*  button at the row's end keeps its space to the edge. */
  padding: 0 var(--space-small) 0 0;
  border-bottom: 1px solid var(--color-neutral-85);
}

.video-call__chat-actions {
  display: flex;
  gap: var(--space-xx-small);
  /*  At the end of the row, also when there are no tabs before it. */
  margin-left: auto;
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

/*  Overlay like the speaker chips, but at the bottom: the body is a row */
/*  (stage | chat sidebar), so an in-flow banner would become a column. */
.video-call__notices {
  position: absolute;
  bottom: var(--space-x-small);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: var(--space-xx-small);
  max-width: calc(100% - var(--space-base));
  z-index: 3;
}

.video-call__notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-x-small);
  padding: var(--space-xx-small) var(--space-small);
  border-radius: var(--border-radius-base);
  text-align: center;
  color: var(--text-color-inverse);
  background: var(--color-neutral-10);
}

.video-call__notice--warning {
  color: var(--color-warning-inverse);
  background: var(--color-warning);
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
  /*  Anchor for the device settings panel. */
  position: relative;
  display: flex;
  gap: var(--space-x-small);
  /*  Little space above and below the buttons: the height goes to the videos. */
  padding: var(--space-xx-small) var(--space-small);
  background: var(--background-color-soft);
  border-top: 1px solid var(--color-neutral-85);
  flex-wrap: wrap;
  justify-content: center;
}

.video-call__device-settings {
  display: flex;
}

.video-call__device-settings-panel {
  position: absolute;
  bottom: calc(100% + var(--space-x-small));
  left: 50%;
  transform: translateX(-50%);
  width: min(380px, calc(100% - 2 * var(--space-x-small)));
  /*  Whatever the page header, the call header and the control bar leave. */
  max-height: calc(100vh - var(--header-height, 0px) - var(--footer-height, 0px) - 140px);
  /*  Above the notices and speaker chips that overlay the stage. */
  z-index: 10;
}

.video-call--minimized .video-call__controls {
  /*  Tighter spacing for the icon-only row in the parked window. */
  padding: var(--space-xxx-small) var(--space-x-small);
  gap: var(--space-xxx-small);
}

.video-call--minimized .video-call__device-settings-panel {
  /*  The parked window clips its content, so the panel has to fit between */
  /*  the window's top edge and the control bar: 280px minus the bar. */
  bottom: calc(100% + var(--space-xxx-small));
  max-height: 232px;
}

/*  Desktop, call maximized (barsManual): the bars stand around the videos, solid, and move */
/*  away together when asked to (.video-call--bars-collapsed) — up and down, the videos and */
/*  the chat beside them growing into their place. Header and control bar go by their */
/*  heights (44px, 45px); hidden once gone, so the keyboard does not land on them. */
/*  The call's header and control bar stand above and below the videos only; the chat */
/*  beside them reaches from the page's header to its footer, and from edge to edge of the */
/*  window once those are gone. A grid of three rows for the videos' column, the chat */
/*  spanning them; the body gives up its box, so the videos and the chat are its cells. */
.video-call--bars-manual {
  overflow: hidden;
  transition: padding 0.3s ease;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto minmax(0, 1fr) auto;
  /*  The body's dark ground, which it no longer paints itself. */
  background: var(--color-neutral-10);
}

.video-call--bars-manual .video-call__body {
  display: contents;
}

.video-call--bars-manual > *,
.video-call--bars-manual .video-call__body > * {
  grid-row: 2;
  grid-column: 1;
}

.video-call--bars-manual .video-call__header {
  grid-row: 1;
}

.video-call--bars-manual .video-call__controls {
  grid-row: 3;
}

.video-call--bars-manual .video-call__sidebar {
  grid-row: 1 / -1;
  grid-column: 2;
  width: 360px;
  max-width: 40vw;
}

.video-call--bars-manual .video-call__header,
.video-call--bars-manual .video-call__controls {
  transition:
    margin 0.3s ease,
    visibility 0s;
}

.video-call--bars-collapsed {
  padding-top: 0;
  padding-bottom: 0;
}

.video-call--bars-collapsed .video-call__header,
.video-call--bars-collapsed .video-call__controls {
  visibility: hidden;
  transition:
    margin 0.3s ease,
    visibility 0s 0.3s;
}

.video-call--bars-collapsed .video-call__header {
  margin-top: -44px;
}

.video-call--bars-collapsed .video-call__controls {
  margin-bottom: -45px;
}

.video-call--bars-collapsed .video-call__stage {
  position: relative;
}

.video-call__show-bars {
  position: absolute;
  top: var(--space-x-small);
  right: var(--space-x-small);
  z-index: 5;
  display: flex;
}

@media (prefers-reduced-motion: reduce) {
  .video-call--bars-manual,
  .video-call--bars-manual .video-call__header,
  .video-call--bars-manual .video-call__controls {
    transition: none;
  }
}

/*  Phone, call maximized (barsOverlay): the call fills the window, the page's header and */
/*  footer lie on it, and so do the call's own header and control bar — over the videos */
/*  only, not over the chat beside them. All four are see-through and move out of the way */
/*  while the mouse rests (.video-call--bars-hidden); the videos keep their size meanwhile. */
/*  One grid cell for the videos and everything lying on them, one for the chat. The body */
/*  gives up its box, so that the call's header and control bar share the videos' cell. */
.video-call--bars-overlay {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr);
  padding-top: 0;
  padding-bottom: 0;
  background: var(--color-neutral-10);
  /*  How far the bars reach into the videos, for what is to stay clear of them: the page's */
  /*  header and footer, and the call's header (44px) and control bar (45px). */
  --video-call-bars-top: calc(var(--header-height) + 44px);
  --video-call-bars-bottom: calc(var(--footer-height) + 45px);
}

.video-call--bars-hidden {
  --video-call-bars-top: 0px;
  --video-call-bars-bottom: 0px;
}

.video-call--bars-overlay .video-call__body {
  display: contents;
}

.video-call--bars-overlay > *,
.video-call--bars-overlay .video-call__body > * {
  grid-row: 1;
  grid-column: 1;
}

.video-call--bars-overlay .video-call__header,
.video-call--bars-overlay .video-call__controls {
  z-index: 4;
  backdrop-filter: blur(var(--video-call-bar-blur));
  transition: transform 0.3s ease;
}

.video-call--bars-overlay .video-call__header {
  align-self: start;
  margin-top: var(--header-height);
  background: color-mix(
    in srgb,
    var(--video-call-bar-header-color) var(--video-call-bar-opacity),
    transparent
  );
}

.video-call--bars-overlay .video-call__controls {
  align-self: end;
  margin-bottom: var(--footer-height);
  background: color-mix(
    in srgb,
    var(--video-call-bar-controls-color) var(--video-call-bar-opacity),
    transparent
  );
}

.video-call--bars-hidden .video-call__header {
  transform: translateY(calc(-100% - var(--header-height)));
}

.video-call--bars-hidden .video-call__controls {
  transform: translateY(calc(100% + var(--footer-height)));
}

.video-call--bars-overlay .video-call__speakers {
  top: calc(var(--video-call-bars-top) + var(--space-x-small));
  transition: top 0.3s ease;
}

.video-call--bars-overlay .video-call__notices {
  bottom: calc(var(--video-call-bars-bottom) + var(--space-x-small));
  transition: bottom 0.3s ease;
}

/*  The tabs stand beside the call's header here: as high as it, line included (RoomHeader */
/*  compact: 28px avatar, 8px above and below), so both end on one level. */
.video-call--bars-manual .video-call__sidebar > .video-call__chat-tabs,
.video-call--bars-overlay .video-call__sidebar > .video-call__chat-tabs {
  box-sizing: border-box;
  min-height: calc(28px + 2 * var(--space-x-small));
}

/*  The chat reaches from the page's header to its footer, and from edge to edge of the */
/*  window once they are gone. */
.video-call--bars-overlay .video-call__sidebar {
  grid-column: 2;
  width: 360px;
  max-width: 40vw;
  box-sizing: border-box;
  padding-top: var(--header-height);
  padding-bottom: var(--footer-height);
  transition: padding 0.3s ease;
}

.video-call--bars-hidden .video-call__sidebar {
  padding-top: 0;
  padding-bottom: 0;
}

@media (prefers-reduced-motion: reduce) {
  .video-call--bars-overlay .video-call__header,
  .video-call--bars-overlay .video-call__controls,
  .video-call--bars-overlay .video-call__speakers,
  .video-call--bars-overlay .video-call__notices,
  .video-call--bars-overlay .video-call__sidebar {
    transition: none;
  }
}

/*  The parked window: the videos fill it, and its header and control bar lie on them, */
/*  see-through like the maximized call's, while the mouse is on the window or the device */
/*  settings are open (.video-call--bars-held), or the keyboard moves in it. Otherwise only */
/*  the number of participants stays, in a corner. */
.video-call--parked-bars {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  /*  The body's dark ground, which it no longer paints itself: no light corner shows */
  /*  around the rounded tiles. */
  background: var(--color-neutral-10);
}

.video-call--parked-bars .video-call__body {
  display: contents;
}

.video-call--parked-bars > *,
.video-call--parked-bars .video-call__body > * {
  grid-row: 1;
  grid-column: 1;
}

.video-call--parked-bars .video-call__header,
.video-call--parked-bars .video-call__controls {
  z-index: 4;
  backdrop-filter: blur(var(--video-call-bar-blur));
  transition: transform 0.3s ease;
}

/*  Chromium draws the blur behind a bar sliding in this small window a step ahead of the */
/*  bar, as a line running in front of the header's lower edge. Without the blur there is */
/*  none; they stay see-through. */
.video-call--chromium.video-call--parked-bars .video-call__header,
.video-call--chromium.video-call--parked-bars .video-call__controls {
  backdrop-filter: none;
}

.video-call--parked-bars .video-call__header {
  align-self: start;
  background: color-mix(
    in srgb,
    var(--video-call-bar-header-color) var(--video-call-bar-opacity),
    transparent
  );
}

.video-call--parked-bars .video-call__controls {
  align-self: end;
  background: color-mix(
    in srgb,
    var(--video-call-bar-controls-color) var(--video-call-bar-opacity),
    transparent
  );
}

.video-call--parked-bars:not(:has(:focus-visible), .video-call--bars-held) .video-call__header {
  transform: translateY(-100%);
}

.video-call--parked-bars:not(:has(:focus-visible), .video-call--bars-held) .video-call__controls {
  transform: translateY(100%);
}

.video-call__parked-count {
  z-index: 3;
  align-self: start;
  justify-self: start;
  margin: var(--space-x-small);
  background: var(--color-primary);
  color: var(--color-primary-inverse);
  padding: 2px var(--space-x-small);
  border-radius: var(--border-radius-rounded);
  font-size: var(--font-size-small);
  min-width: 28px;
  text-align: center;
  transition: opacity 0.3s ease;
}

.video-call--parked-bars:is(:has(:focus-visible), .video-call--bars-held)
  .video-call__parked-count {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .video-call--parked-bars .video-call__header,
  .video-call--parked-bars .video-call__controls,
  .video-call__parked-count {
    transition: none;
  }
}

@media (--vp-mobile) {
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
