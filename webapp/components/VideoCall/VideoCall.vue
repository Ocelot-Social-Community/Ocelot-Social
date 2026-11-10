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
          'video-call--fullscreen': inFullscreen,
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
            v-if="showFullscreenButton"
            v-tooltip="fullscreenLabel"
            data-test="video-call-fullscreen"
            variant="primary"
            appearance="outline"
            size="sm"
            circle
            :aria-label="fullscreenLabel"
            @click="toggleFullscreen"
          >
            <template #icon>
              <os-icon :icon="inFullscreen ? icons.fullscreenExit : icons.fullscreen" />
            </template>
          </os-button>
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
      <!--
        Folded notices wait in the corner below on the right, where the control bar's button
        to unfold them is while it shows.
      -->
      <span
        v-if="parked && hasNotices && !noticesOpen"
        class="video-call__parked-notices"
        data-test="video-call-parked-notices"
        aria-hidden="true"
      >
        <os-icon :icon="icons.warning" />
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
          <div
            v-if="isMaximized && !mobileChatOpen && activeSpeakers.length"
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
              Problems the call cannot fix on its own. Inside the stage, which anchors
              them: placed from the body instead, which gives up its box in the maximized
              layouts, they went by the whole call — over the control bar, centred across
              the chat as well, their buttons behind the page's footer. In the parked window
              they are folded behind a button in the header (noticesCollapsed), but still
              announced: folded means out of sight, not out of the accessibility tree.

              Announced from two live regions that are there before they have anything to
              say: a region inserted along with its message is passed over by some screen
              readers. One for what stands in the user's way, said at once (role="alert"),
              on top; one for what only informs, waiting its turn (role="status").
            -->
            <div
              id="video-call-notices"
              :class="[
                'video-call__notices',
                { 'video-call__notices--collapsed': noticesCollapsed },
              ]"
              data-test="video-call-notices"
            >
              <div
                class="video-call__notices-region"
                role="alert"
                data-test="video-call-notices-alert"
              >
                <call-notice
                  v-if="audioBlocked"
                  data-test="video-call-audio-blocked"
                  tone="warning"
                  :message="$t('videoCall.audioBlocked')"
                  :actions="[
                    {
                      key: 'enable',
                      label: $t('videoCall.enableAudio'),
                      dataTest: 'video-call-enable-audio',
                    },
                  ]"
                  @action="enableAudio"
                />
                <call-notice
                  v-if="micProblem"
                  data-test="video-call-mic-problem"
                  tone="warning"
                  :message="$t('videoCall.micNoSignal')"
                  :actions="[
                    {
                      key: 'restart',
                      label: $t('videoCall.restartMic'),
                      dataTest: 'video-call-restart-mic',
                    },
                  ]"
                  @action="restartMic"
                />
              </div>
              <div
                class="video-call__notices-region"
                role="status"
                data-test="video-call-notices-status"
              >
                <!--
                  An admin switched the branding; applying it takes a reload, which waits for
                  this call to end (#10353). Said here for as long as it waits, so that the
                  reload after hanging up comes as no surprise.
                -->
                <call-notice
                  v-if="reloadPending"
                  data-test="video-call-reload-pending"
                  :message="$t('videoCall.reloadPending')"
                />
                <call-notice
                  v-if="reconnecting"
                  data-test="video-call-reconnecting"
                  :message="$t('videoCall.reconnecting')"
                />
                <call-notice
                  v-if="audioOnly"
                  data-test="video-call-audio-only"
                  :message="$t('videoCall.audioOnly')"
                  :actions="[
                    {
                      key: 'show',
                      label: $t('videoCall.showVideos'),
                      dataTest: 'video-call-show-videos',
                    },
                  ]"
                  @action="showVideos"
                />
                <!--
                  Why the cameras got coarse, and the way back. Nothing tells us when the CPU has
                  room again — the relief itself takes away the load it was measured by — so taking
                  it back is the user's call, not a guess of ours that could flip back and forth.
                -->
                <call-notice
                  v-if="cpuConstrained"
                  data-test="video-call-cpu-relief"
                  :message="$t('videoCall.cpuRelief')"
                  :actions="[
                    {
                      key: 'restore',
                      label: $t('videoCall.restoreQuality'),
                      dataTest: 'video-call-restore-quality',
                      disabled: renewingCamera,
                    },
                  ]"
                  @action="restoreVideoQuality"
                />
                <call-notice
                  v-else-if="cpuStrained"
                  data-test="video-call-cpu-strained"
                  :message="$t('videoCall.cpuStrained')"
                  :actions="[
                    {
                      key: 'lower',
                      label: $t('videoCall.lowerQuality'),
                      dataTest: 'video-call-lower-quality',
                    },
                    {
                      key: 'dismiss',
                      label: $t('videoCall.dismissNotice'),
                      dataTest: 'video-call-dismiss-cpu',
                    },
                  ]"
                  @action="onCpuStrainedAction"
                />
              </div>
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
              :quality-limit="qualityLimitOf(tile)"
              :clickable="isMaximized && !mobileChatOpen"
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
          :aria-label="controlName(micLabel, micAction)"
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
          :aria-label="controlName(cameraLabel, cameraAction)"
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
          :aria-label="controlName(screenShareLabel, screenShareAction)"
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
            :dtx="dtx"
            :dtx-applying="dtxApplying"
            :send-quality="sendQuality"
            :receive-quality="receiveQuality"
            :camera-renewing="renewingCamera"
            @switch="switchDevice"
            @dtx-change="setDtx"
            @send-quality-change="setSendQuality"
            @receive-quality-change="setReceiveQuality"
            @close="closeDeviceSettings({ restoreFocus: true })"
          />
        </div>
        <os-button
          v-tooltip="controlTooltip(chatAction)"
          :variant="chatOpenForThisCall ? 'primary' : 'default'"
          appearance="outline"
          :size="parked ? 'sm' : 'md'"
          :circle="iconOnly"
          :aria-label="controlName(chatLabel, chatAction)"
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
          :aria-label="controlName(leaveLabel, leaveAction)"
          @click="leave"
        >
          <template #icon>
            <os-icon :icon="icons.phone" />
          </template>
          <template v-if="!iconOnly">
            {{ leaveLabel }}
          </template>
        </os-button>
        <!--
          In the parked window the notices would cover its small picture: they wait behind
          this button, in the bar's corner below on the right. A warning sign in the warning
          colour, whatever they say: a bell or the like did not tell that something is to be
          read. In a wrapper of its own: OsButton's root carries no scoped-style attribute,
          so a position set on it would not apply.
        -->
        <div v-if="parked && hasNotices" class="video-call__notices-toggle">
          <os-button
            v-tooltip="noticesToggleLabel"
            data-test="video-call-notices-toggle"
            variant="warning"
            appearance="filled"
            size="sm"
            circle
            :aria-label="noticesToggleLabel"
            :aria-expanded="noticesOpen ? 'true' : 'false'"
            aria-controls="video-call-notices"
            @click="noticesOpen = !noticesOpen"
          >
            <template #icon>
              <os-icon :icon="icons.warning" />
            </template>
          </os-button>
        </div>
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
import CallNotice from './CallNotice.vue'
import { saveDevicePreference } from './devicePreferences'
import { createAudioWatchdog } from './audioWatchdog'

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

// Stops a local capture for good. Some LiveKit versions keep the underlying
// MediaStreamTrack around even after track.stop(), so that one is stopped too.
function stopCapture(track) {
  if (!track) return
  try {
    track.stop()
  } catch (_e) {
    /* noop */
  }
  const mediaTrack = track.mediaStreamTrack
  if (mediaTrack && typeof mediaTrack.stop === 'function') {
    try {
      mediaTrack.stop()
    } catch (_e) {
      /* noop */
    }
  }
}

// LiveKit rates every participant's connection several times a minute. Videos
// are paused once ours stays weak this long, and come back only after it has
// been fine for clearly longer, so a flaky line doesn't make them flicker.
const WEAK_CONNECTION_MS = 5000
const RECOVERED_CONNECTION_MS = 20000
const WEAK_QUALITIES = ['poor', 'lost']
// What our camera captures for each send quality the user can choose. 'auto' and
// 'high' capture alike, LiveKit's default; 'high' only keeps the CPU relief off.
// The capture, not a cap on the layers: dynacast sets those anew whenever the
// server reports who watches which, and a smaller picture eases the encoder too.
// How often what our camera actually sends is read, for the badge on our own tile. One call
// on one track — little next to the encoding itself.
const SENDER_STATS_MS = 3000
const SEND_RESOLUTIONS = {
  high: { width: 1280, height: 720 },
  medium: { width: 640, height: 360 },
  low: { width: 320, height: 180 },
}
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
// come within this time and are no activity of their own. A key pressed is none of them.
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
    CallNotice,
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
      VideoQuality: null,
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
      // The user's own choice on leaving out pauses in speech (Opus DTX) for
      // this call, or null to follow the network's default. Never stored: every
      // call starts on the network's default, so an admin's change reaches
      // everyone and a choice made against one bad connection does not linger.
      dtxPreference: null,
      // The network's default as the call started with it. Read once per call: the microphone
      // was published with it, and a policy changed meanwhile reaches the next call — shown
      // here at once, it would claim a setting the microphone does not have.
      dtxDefault: false,
      dtxApplying: false,
      reconnecting: false,
      // Remote cameras are unsubscribed because our connection is weak — the
      // sound gets the bandwidth. audioOnlyDismissed: the user asked for the
      // videos back, so we stop deciding for them until the next call.
      audioOnly: false,
      audioOnlyDismissed: false,
      // Our machine cannot keep up with encoding and decoding video, and the
      // cameras give way. Holds until the user takes it back.
      cpuConstrained: false,
      // The user took the relief back: for the rest of the call a CPU limit
      // only offers it again (cpuStrained), it does not decide for them.
      cpuReliefDeclined: false,
      cpuStrained: false,
      // The user accepted our offer to lower the quality, past a choice of their own — per
      // direction, as a new choice for one of them lets that one off again.
      sendReliefForced: false,
      receiveReliefForced: false,
      // A cap was put on the remote cameras in this call; until then there is none to lift.
      receiveCapped: false,
      // The video quality the user asked for, sent and received ('auto' or one of
      // devicePreferences' SEND_QUALITIES / RECEIVE_QUALITIES). For this call only: the next
      // one judges anew what the line and the device allow (see cleanup).
      sendQuality: 'auto',
      receiveQuality: 'auto',
      // Our camera is being started anew — with its full quality, or another capture.
      renewingCamera: false,
      // What our camera sends, as WebRTC reports it: { height, fps, limitedBy } — limitedBy
      // being 'cpu', 'bandwidth' or null. Null while it sends nothing.
      sentVideo: null,
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
      // The notices are unfolded in the parked window (see noticesCollapsed).
      noticesOpen: false,
      // Only Chromium-based browsers (Chrome, Edge, Opera, …) know navigator.userAgentData.
      // Set once mounted: the server renders no browser.
      isChromium: false,
      // Whether the browser can show the page in fullscreen, and whether it does now.
      canFullscreen: false,
      inFullscreen: false,
      // The control bar: how wide it is, and how wide it was the last time its buttons
      // had their labels (see controlsCrowded).
      controlsWidth: 0,
      labeledControlsWidth: 0,
    }
  },
  computed: {
    // Opus DTX: while we are silent, our microphone sends hardly any packets.
    // Off unless the network or the user turns it on — a nearly idle audio
    // path leaves more room for one listener losing us (#10787), and LiveKit's
    // own meet app keeps it off as well.
    // The CPU relief reaches what the user left to the call — or everything, once they
    // asked for it themselves.
    sendRelieved() {
      return this.cpuConstrained && (this.sendReliefForced || this.sendQuality === 'auto')
    },
    receiveRelieved() {
      return this.cpuConstrained && (this.receiveReliefForced || this.receiveQuality === 'auto')
    },
    // The remote cameras are off: our connection is weak, or the user wants sound only.
    videosOff() {
      return this.audioOnly || this.receiveQuality === 'audio'
    },
    dtx() {
      if (this.dtxPreference !== null) return this.dtxPreference
      return this.dtxDefault
    },
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
      // phone the call is always maximized and the chat takes the place below
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
      return !this.isMaximized || this.mobileChatOpen
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
    isMaximized() {
      // During prejoin we render as a centered modal — not maximized.
      if (this.isPreJoinModal) return false
      return this.isMobile || !this.minimized || this.phase !== 'in-call'
    },
    // On a phone, and in fullscreen, the maximized call fills the screen: its header and
    // control bar lie on the videos, see-through, and move out of the way by themselves —
    // after a while without a touch or a tap on a phone, while the mouse rests in
    // fullscreen. Not with the chat open on a phone, where one writes beneath a small tile.
    barsOverlay() {
      return this.isMaximized && !this.mobileChatOpen && (this.isMobile || this.inFullscreen)
    },
    // On a desktop the bars of the maximized call — the page's header and footer, the
    // call's header and control bar — stand around the videos, solid, and move only when
    // asked to, with a button: a mouse moved by chance would bring them in, and together
    // they are high. In fullscreen they lie on the videos and move by themselves, as on a
    // phone (barsOverlay).
    barsManual() {
      return (
        this.isMaximized &&
        !this.isMobile &&
        !this.inFullscreen &&
        this.phase === 'in-call' &&
        !this.error
      )
    },
    // Only once there are videos to make room for.
    autoHideBars() {
      return this.barsOverlay && this.phase === 'in-call' && !this.error
    },
    // What the page's header and footer do meanwhile (layouts/default.vue). In fullscreen
    // they stay away, also with the chat open on a phone: the call is all there is.
    pageBars() {
      if (this.inFullscreen) return 'hidden'
      if (this.barsOverlay) return this.barsHidden ? 'hidden' : 'overlay'
      if (this.barsManual) return this.barsCollapsed ? 'collapsed' : 'manual'
      return 'normal'
    },
    // Fullscreen is offered for the maximized call wherever the browser can show it —
    // on a phone too (Android), where it also hides the browser's own bars. An iPhone
    // cannot, and gets no button.
    showFullscreenButton() {
      return this.canFullscreen && this.isMaximized && this.phase === 'in-call'
    },
    fullscreenLabel() {
      return this.inFullscreen
        ? this.$t('videoCall.exitFullscreen')
        : this.$t('videoCall.enterFullscreen')
    },
    modeClass() {
      if (this.isPreJoinModal) return 'video-call--modal'
      return this.isMaximized ? 'video-call--maximized' : 'video-call--minimized'
    },
    onCallRoute() {
      return this.$route.name === 'call-id-slug'
    },
    parked() {
      // The call sits in the corner as a small window: during an active call —
      // not during the prejoin modal — and never on a phone, where the call is
      // always maximized.
      return this.phase === 'in-call' && this.minimized && !this.isMobile
    },
    hasNotices() {
      return !!(
        this.audioBlocked ||
        this.micProblem ||
        this.reconnecting ||
        this.audioOnly ||
        this.cpuConstrained ||
        this.cpuStrained ||
        this.reloadPending
      )
    },
    noticesCollapsed() {
      return this.parked && !this.noticesOpen
    },
    noticesToggleLabel() {
      return this.noticesOpen ? this.$t('videoCall.hideNotices') : this.$t('videoCall.showNotices')
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
      if (!this.isMaximized || this.spotlightTile) {
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
    // A warning unfolds the notices, each time one comes up: without sound or with a silent
    // microphone, the call does not work, and the user is to learn that without looking for
    // it. Each warning for itself — one the user folded away does not hide the next. What
    // only informs waits behind the button.
    audioBlocked(blocked) {
      if (blocked) this.noticesOpen = true
    },
    micProblem(problem) {
      if (problem) this.noticesOpen = true
    },
    // Once there is nothing to say, the next notice starts folded again.
    hasNotices(any) {
      if (!any) this.noticesOpen = false
    },
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
    // Parked or left: the call leaves fullscreen with it.
    showFullscreenButton(offered) {
      if (!offered) this.exitFullscreen()
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
      // it maximized blocks the page they just navigated to. Close instead.
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
    // A reading of our camera's sender stats is under way (readSenderStats).
    this.senderStatsReading = false
    this.micSilenceProbe = null
    // Tracks whose events we listen to — publishing a track anew must not
    // double the listeners.
    this.watchedMicTracks = new WeakSet()
    this.stageObserver = null
    this.observedStage = null
    this.qualityTimer = null
    this.qualityClass = null
    this.audioWatchdog = null
    this.leaving = false
    this.unmounting = false
    // The room cleanup() is taking down: this.room stays it until the disconnect is through.
    this.closingRoom = null
    // Settles once a renewal of our camera (renewOwnCamera) is through.
    this.cameraRenewal = null
    this.senderStatsTimer = null
    // The user switched the camera off, and LiveKit has yet to say it is done — until then
    // cameraEnabled still says on. Taking long while a reconnect holds a publish back.
    this.cameraOffPending = false
    // Counts the ways into and out of a call; a connect() whose number is no longer the
    // current one was given up while it waited — for its token, say.
    this.connectAttempt = 0
    this.deviceSwitches = this.newDeviceSwitches()
    this.callChatsSub = null
    this.groupChatRoomId = null
    this.callChatRetryTimer = null
    // How often the conference chat has been asked for; see joinCallChat.
    this.callChatAsks = 0
    // How many unread counts have been pushed for each chat; a query for the count that is
    // overtaken by a push gives way to it (loadConferenceUnread, loadGroupChatUnread).
    this.conferenceUnreadPushes = 0
    this.groupChatUnreadPushes = 0
  },
  mounted() {
    this.isChromium = typeof navigator !== 'undefined' && !!navigator.userAgentData
    this.canFullscreen = !!document.fullscreenEnabled
    document.addEventListener('fullscreenchange', this.onFullscreenChange)
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
    document.removeEventListener('fullscreenchange', this.onFullscreenChange)
    this.unmounting = true
    this.exitFullscreen()
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
    // The whole page goes fullscreen, not the call alone: tooltips, menus and toasts are
    // put at the end of the page, outside the call, and would not show otherwise. The
    // page's header and footer are kept away meanwhile (pageBars).
    async toggleFullscreen() {
      try {
        if (this.pageInFullscreen()) {
          await document.exitFullscreen()
          return
        }
        await document.documentElement.requestFullscreen()
        // The browser takes a moment. Parked, left or gone from the page meanwhile, the call
        // has no use for it any more — and the watcher or beforeDestroy that ends it found
        // nothing to end yet. Once gone, showFullscreenButton keeps its last value.
        if (this.unmounting || !this.showFullscreenButton) this.exitFullscreen()
      } catch {
        // Refused by the browser (no user gesture, a policy): the call stays as it is.
      }
    },
    // Only the page's own fullscreen is the call's: one of, say, a video embedded in a
    // post is neither taken for it nor ended by it.
    pageInFullscreen() {
      return (
        typeof document !== 'undefined' && document.fullscreenElement === document.documentElement
      )
    },
    exitFullscreen() {
      if (!this.pageInFullscreen()) return
      document.exitFullscreen().catch(() => {})
    },
    // Also when the browser ends it (Esc).
    onFullscreenChange() {
      this.inFullscreen = this.pageInFullscreen()
    },
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
        this.swallowTileSelect = false
      }
    },
    onBarActivity(event) {
      if (event.type === 'pointerdown' && event.pointerType === 'touch') {
        this.onBarTouch(event)
        return
      }
      // A click with the mouse or a pen is the user's own: a tile it lands on is selected.
      if (event.type === 'pointerdown') this.swallowTileSelect = false
      if (event.type !== 'keydown' && Date.now() - this.lastTouchAt < TOUCH_ECHO_MS) return
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
    // the tap is on a tile, which spotlights it as ever, or on a notice lying on the
    // videos, whose buttons are to act alone. Other taps keep them a while.
    onBarTouch(event) {
      this.lastTouchAt = Date.now()
      this.swallowTileSelect = false
      const onStage = event.target?.closest?.('.video-call__stage')
      if (this.barsHidden) {
        this.barsHidden = false
        this.swallowTileSelect = !!onStage
        this.scheduleBarsHide()
      } else if (onStage && !event.target.closest('.video-tile, .video-call__notices')) {
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
      // Only the latest question counts. A reconnect asks again while the first answer may
      // still be on its way, and the server may have opened a new session in between: the
      // older answer would put the chat of a session that is over back in place.
      const ask = ++this.callChatAsks
      try {
        const { data } = await this.$apollo.mutate({
          mutation: joinGroupVideoCallChatMutation(),
          variables: { groupId },
        })
        // The call may have been left, or swapped for another, in the meantime.
        if (this.room !== room || this.groupId !== groupId || ask !== this.callChatAsks) return
        const chatRoomId = (data && data.joinGroupVideoCallChat) || null
        this.setChatRoomId(chatRoomId)
        // Updates only tell of what is written from now on; what came before — while the
        // page was reloaded, say — is asked for once.
        if (chatRoomId) this.loadConferenceUnread(chatRoomId)
      } catch (_e) {
        if (this.room !== room || this.groupId !== groupId || ask !== this.callChatAsks) return
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
        this.conferenceUnreadPushes++
        this.setConferenceUnread(room.unreadCount)
      } else if (this.groupChatRoomId && room.id === this.groupChatRoomId) {
        this.groupChatUnreadPushes++
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
      const pushes = this.groupChatUnreadPushes
      try {
        const { data } = await this.$apollo.query({
          query: roomUnreadQuery(),
          variables: { groupId },
          fetchPolicy: 'network-only',
        })
        // The call may have been left, or swapped for another, in the meantime.
        if (this.groupId !== groupId || this.phase !== 'in-call') return
        // A push for the chat came in meanwhile: it is newer than what the query read.
        if (this.groupChatUnreadPushes !== pushes) return
        const room = data && data.Room && data.Room[0]
        this.groupChatRoomId = room ? room.id : null
        this.setGroupChatUnread(room ? room.unreadCount : 0)
      } catch (_e) {
        /* the tab simply goes without a count */
      }
    },
    // What is unread in the call's conference chat when it is joined; updates follow by
    // its id (onCallChatUpdated).
    async loadConferenceUnread(roomId) {
      const pushes = this.conferenceUnreadPushes
      try {
        const { data } = await this.$apollo.query({
          query: roomUnreadQuery(),
          variables: { id: roomId },
          fetchPolicy: 'network-only',
        })
        // The call may have been left, or its chat swapped for another, in the meantime.
        if (this.chatRoomId !== roomId) return
        // A push for the chat came in meanwhile: it is newer than what the query read.
        if (this.conferenceUnreadPushes !== pushes) return
        const room = data && data.Room && data.Room[0]
        if (room) this.setConferenceUnread(room.unreadCount)
      } catch (_e) {
        /* the tab simply goes without a count until the next message */
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
    // The name a screen reader gives a control: what a click on it does. While the button
    // spells out its label, the name has to hold that word too, so the control can be called
    // by it by voice (WCAG 2.5.3, label in name): put in front where the action lacks it, as
    // "Headset: turn off" does next to "Microphone".
    controlName(label, action) {
      if (this.iconOnly || action.toLowerCase().includes(label.toLowerCase())) return action
      return `${label}, ${action}`
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
      // Only spotlight when maximized — minimized window already shows one tile.
      if (!this.isMaximized) return
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
      this.stopAudioWatchdog()
      this.dtxApplying = false
      this.dtxPreference = null
      this.dtxDefault = !!(this.$policy && this.$policy.get('videoCallDtx'))
      this.dtxSwitch = null
      this.resetAudioOnly()
      const attempt = ++this.connectAttempt
      let room = null
      try {
        if (!this.groupId) throw new Error('Missing group id')
        const payload = await this.takeJoinPayload(this.groupId)

        const livekit = await import('livekit-client')
        const {
          Room,
          RoomEvent,
          ParticipantEvent,
          Track,
          TrackEvent,
          VideoQuality,
          DisconnectReason,
        } = livekit
        // Closed while the token or the client library was on its way: cleanup() found no
        // room to take down then, so nothing may join one now. Nor while hanging up still
        // navigates away, before its cleanup() has begun.
        if (attempt !== this.connectAttempt || this.leaving) return
        this.Track = Track
        this.VideoQuality = VideoQuality

        room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            ...(this.cameraDeviceId ? { deviceId: this.cameraDeviceId } : {}),
            ...(SEND_RESOLUTIONS[this.sendQuality]
              ? { resolution: SEND_RESOLUTIONS[this.sendQuality] }
              : {}),
          },
          audioCaptureDefaults: this.micDeviceId ? { deviceId: this.micDeviceId } : {},
          publishDefaults: { dtx: this.dtx },
          // LiveKit picks the speaker anew whenever a device comes or goes.
          // Unless it knows ours, that puts everyone back on the system
          // default without a word.
          ...(this.speakerDeviceId ? { audioOutput: { deviceId: this.speakerDeviceId } } : {}),
        })
        // Reset only now: until the line below, this.room is still the previous
        // room, and its late CPU event would pass the room check in the listener.
        this.cpuConstrained = false
        this.cpuReliefDeclined = false
        this.cpuStrained = false
        this.sendReliefForced = false
        this.receiveReliefForced = false
        this.receiveCapped = false
        this.renewingCamera = false
        this.room = room

        const onAny = () => this.refreshTiles()
        room.on(RoomEvent.ParticipantConnected, onAny)
        room.on(RoomEvent.ParticipantDisconnected, onAny)
        room.on(RoomEvent.TrackSubscribed, (_track, pub) => {
          // Subscribed before the unsubscribe of audio-only mode took hold.
          if (this.videosOff) this.applyAudioOnly()
          // Also one whose cap changed while audio-only mode had it unsubscribed, out of reach.
          this.applyReceiveCap(pub)
          onAny()
        })
        // Encoding and decoding video can eat the CPU to the point where the
        // audio stutters as well. Once the browser reports that our own video is
        // held back by the CPU, the cameras give way: ours is sent small and at
        // 15 fps, everyone else's arrives in the lowest layer. Screen shares
        // keep their quality — they are what the call is about, and unreadable
        // when small.
        room.localParticipant.on(ParticipantEvent.LocalTrackCpuConstrained, () => {
          // A late event of a room already replaced must not throttle the new call.
          if (this.room !== room || this.cpuConstrained) return
          // Taken back before, or nothing left to the call that the relief could lower:
          // the user decides.
          const offer =
            this.cpuReliefDeclined ||
            (this.sendQuality !== 'auto' && this.receiveQuality !== 'auto')
          // A deliberate diagnosis: the only trace of why the videos got coarse.
          // eslint-disable-next-line no-console
          console.warn(
            offer
              ? '[video-call] CPU constrained, offering to lower the video quality'
              : '[video-call] CPU constrained, lowering the video quality of the cameras',
          )
          if (offer) this.cpuStrained = true
          else this.relieveCpu()
        })
        // A camera published while we are in audio-only mode would otherwise
        // be auto-subscribed and eat the bandwidth we just freed.
        room.on(RoomEvent.TrackPublished, () => {
          if (this.videosOff) this.applyAudioOnly()
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
          // A camera switched on only now gets the same relief.
          if (this.sendRelieved && pub && pub.source === Track.Source.Camera) {
            this.relieveOwnCamera()
          }
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
        // Hung up while connecting: no microphone, no camera — cleanup() takes the room down.
        if (!this.isLive(room)) return
        if (this.micEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true)
        }
        if (!this.isLive(room)) return
        if (this.cameraEnabled) {
          await room.localParticipant.setCameraEnabled(true)
        }
        // Hung up while the devices were coming up: there is no call left to be in.
        if (!this.isLive(room)) return
        this.refreshTiles()
        this.audioBlocked = !room.canPlaybackAudio
        this.phase = 'in-call'
        // One listener can lose one speaker's audio while everyone else still
        // hears them — repair that subscription instead of waiting it out.
        this.audioWatchdog = createAudioWatchdog({
          room,
          Track,
          // A reconnect re-subscribes everything anyway.
          isPaused: () => this.reconnecting,
        })
        this.audioWatchdog.start()
        this.startSenderStats()
        this.joinCallChat(room)
        this.watchCallChats(true)
        this.loadGroupChatUnread()
        this.refreshKnownDevices()
      } catch (err) {
        // Hung up meanwhile, or given up for a new attempt: not this call's to report.
        if (this.leaving || attempt !== this.connectAttempt || (room && !this.isLive(room))) return
        const message = this.$backendError(err)
        // The user navigated away while the handshake was still running, so
        // the window is parked in the corner. Since isMaximized treats every
        // non-'in-call' phase as maximized, showing the error block here
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
      const collectAudio = (participant, source) => {
        for (const pub of participant.audioTrackPublications.values()) {
          if (!Track || pub.source === source) return pub.track || null
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
        const audioTrack = collectAudio(participant, Track && Track.Source.Microphone)
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
        // Unsubscribed by us (see applyAudioOnly): LiveKit keeps the track until the server
        // confirms, which on a weak line takes long — the tile would stay black meanwhile.
        const cameraShown = !!cameraPub && cameraPub.isDesired !== false
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
          videoTrack: cameraShown ? cameraPub.track : null,
          audioTrack,
          isLocal,
          isScreen: false,
          micEnabled,
          connectionQuality: participant.connectionQuality || 'unknown',
          // On at the other end, but not received here: unsubscribed by us (see applyAudioOnly).
          cameraHidden: !isLocal && !!participant.isCameraEnabled && !cameraShown,
        })
        if (screenPub) {
          tiles.push({
            key: `${participant.identity}/screen`,
            identity: participant.identity,
            name: participant.name || participant.identity,
            profile,
            videoTrack: screenPub.track,
            // The sound of the shared tab or screen plays from this tile, as long
            // as the share runs. Whether there is any is the sharer's choice in
            // the browser's share dialog; browsers that cannot capture it publish
            // none. Our own we would only hear twice.
            audioTrack: isLocal ? null : collectAudio(participant, Track.Source.ScreenShareAudio),
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
      // A renewal of our camera begun before this pick goes first (see below). Taken now:
      // a renewal begun later waits for this switch instead, and neither for the other.
      const renewal = kind === 'videoinput' ? this.cameraRenewal : null
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
        if (!this.isLive(room) || ticket !== switching.latest) return
        if (kind === 'audioinput' && this.dtxSwitch) {
          await this.dtxSwitch
          if (!this.isLive(room) || ticket !== switching.latest) return
        }
        // A camera being started anew could be published after the switch, on the device
        // it was started with: the switch waits for it and then moves the fresh one.
        if (renewal) {
          await renewal
          if (!this.isLive(room) || ticket !== switching.latest) return
        }
        const captures = this.capturesOf(room, kind)
        // false: the capture was restarted, but not on the device asked for.
        const switched = await room.switchActiveDevice(kind, deviceId)
        if (this.releaseIfLeft(room, captures)) return
        if (switched === false) throw new Error('Device not switched')
      } catch (err) {
        if (!this.isLive(room)) return
        this.showSwitchErrorToast(kind, err)
        // Overtaken by a newer pick: the selection and LiveKit are that one's
        // business now. Taking them back here would undo it.
        if (ticket !== switching.latest) return
        const settled = switching.settled
        this[field] = settled
        // LiveKit stops the running capture before it opens the new one, so a
        // refused switch leaves none — go back to the one that worked.
        if (settled) {
          const captures = this.capturesOf(room, kind)
          try {
            await room.switchActiveDevice(kind, settled)
            this.releaseIfLeft(room, captures)
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
    // The call's room, and not on its way out: cleanup() keeps this.room until the
    // disconnect is through, and a device started meanwhile would outlive the call.
    // leave() navigates away before its cleanup() begins.
    isLive(room) {
      return !!room && this.room === room && this.closingRoom !== room && !this.leaving
    },
    // The tracks a device switch of this kind restarts.
    capturesOf(room, kind) {
      const source = { audioinput: 'Microphone', videoinput: 'Camera' }[kind]
      if (!source) return []
      const pub = room.localParticipant.getTrackPublication(this.Track.Source[source])
      const tracks = [pub && pub.track]
      if (kind === 'audioinput' && this.dtxSwitch) tracks.push(this.dtxTrack)
      return tracks
    },
    // LiveKit opens a fresh capture on restarting a track, also one cleanup() has
    // stopped — and once the room is gone nobody stops that one but us.
    releaseIfLeft(room, tracks) {
      if (this.isLive(room)) return false
      tracks.forEach(stopCapture)
      return true
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
      // The user's own choice of sound only leaves nothing for a weak line to switch off.
      if (WEAK_QUALITIES.includes(quality) && !this.videosOff && !this.audioOnlyDismissed) {
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
      const wanted = !this.videosOff
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
    stopAudioWatchdog() {
      if (this.audioWatchdog) this.audioWatchdog.stop()
      this.audioWatchdog = null
    },
    // forced: asked for by the user, so it lowers their own choices as well.
    relieveCpu(forced = false) {
      const room = this.room
      if (!room) return
      this.cpuConstrained = true
      this.sendReliefForced = forced
      this.receiveReliefForced = forced
      this.cpuReliefDeclined = false
      this.cpuStrained = false
      if (this.sendRelieved) this.relieveOwnCamera()
      this.applyReceiveCaps()
    },
    onCpuStrainedAction(key) {
      if (key === 'lower') this.relieveCpu(true)
      else this.cpuStrained = false
    },
    // The lowest of what the relief and the user's choice ask for, or null for none.
    receiveCap() {
      const { LOW, MEDIUM, HIGH } = this.VideoQuality
      const caps = []
      if (this.receiveRelieved) caps.push(LOW)
      const chosen = { high: HIGH, medium: MEDIUM, low: LOW }[this.receiveQuality]
      if (chosen !== undefined) caps.push(chosen)
      return caps.length ? Math.min(...caps) : null
    },
    applyReceiveCap(pub) {
      const cap = this.receiveCap()
      if (cap === null) {
        if (this.receiveCapped) this.uncapCameraQuality(pub)
        return
      }
      this.receiveCapped = true
      if (cap === this.VideoQuality.HIGH) this.uncapCameraQuality(pub)
      else this.capCameraQuality(pub, cap)
    },
    applyReceiveCaps() {
      for (const participant of this.room.remoteParticipants.values()) {
        for (const pub of participant.videoTrackPublications.values()) {
          this.applyReceiveCap(pub)
        }
      }
    },
    setReceiveQuality(quality) {
      if (quality === this.receiveQuality) return
      const wereOff = this.videosOff
      this.receiveQuality = quality
      // A choice made now outweighs the relief the user accepted before.
      this.receiveReliefForced = false
      this.settleRelief()
      // The user's choice, not a weak line: the automatic mode and its notice give way. What
      // the line is like stays known (qualityClass), for when the cameras come back.
      if (quality === 'audio') {
        this.clearQualityTimer()
        this.audioOnly = false
      }
      if (!this.room || !this.Track) return
      if (this.videosOff !== wereOff) this.applyAudioOnly()
      // Back from sound only onto a line that is still weak: LiveKit reports only changes,
      // so the grace period starts now, not with a report that may never come.
      if (wereOff && !this.videosOff && this.qualityClass === 'weak' && !this.audioOnlyDismissed) {
        this.qualityTimer = setTimeout(() => this.setAudioOnly(true), WEAK_CONNECTION_MS)
      }
      this.applyReceiveCaps()
    },
    // Both directions chosen anew past the relief: nothing is relieved any more, so its
    // notice goes, and a later CPU limit offers it again.
    settleRelief() {
      if (this.cpuConstrained && !this.sendRelieved && !this.receiveRelieved) {
        this.cpuConstrained = false
      }
    },
    async setSendQuality(quality) {
      if (quality === this.sendQuality || this.renewingCamera) return
      this.sendQuality = quality
      this.sendReliefForced = false
      this.settleRelief()
      const room = this.room
      if (!room || !this.Track) return
      const defaults = { ...room.options.videoCaptureDefaults }
      if (SEND_RESOLUTIONS[quality]) defaults.resolution = SEND_RESOLUTIONS[quality]
      else delete defaults.resolution
      // Every camera started from now on captures so — the fresh one below included.
      room.options.videoCaptureDefaults = defaults
      // Captured anew: only a fresh track has the layers of its new size known to the
      // server — and it is let off a relief the new choice no longer allows. One the relief
      // still reaches gets it again once published (LocalTrackPublished).
      await this.renewOwnCamera(room)
    },
    async restoreVideoQuality() {
      const room = this.room
      const Track = this.Track
      if (!room || !Track || this.renewingCamera) return
      const wasRelieved = this.sendRelieved
      this.cpuConstrained = false
      this.sendReliefForced = false
      this.receiveReliefForced = false
      this.cpuReliefDeclined = true
      // Back to the user's own choice, if they made one.
      this.applyReceiveCaps()
      if (wasRelieved) await this.renewOwnCamera(room)
    },
    async renewOwnCamera(room) {
      const Track = this.Track
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera)
      const track = pub && pub.track
      if (!track) return
      // LiveKit has no way back from prioritizePerformance(): the track keeps
      // its performance mode for good, and with it dynacast and the encoder
      // adjustments stay off — publishing the same track anew changes nothing.
      // So the track goes, and a fresh one takes its place, captured by the
      // room's defaults as they are now. A camera switched off right now gets
      // its fresh track when it is switched on — and so does one being switched off.
      const restart = this.cameraEnabled && !this.cameraOffPending
      this.renewingCamera = true
      if (restart) this.deviceStarts('videoinput')
      let renewed
      const renewal = new Promise((resolve) => {
        renewed = resolve
      })
      this.cameraRenewal = renewal
      // Camera switches asked for before go first: a second capture of a device still
      // starting can lock the switch out of it. Later ones wait for this renewal.
      const switched = this.deviceSwitches.videoinput.queue
      try {
        await switched
        if (!this.isLive(room)) return
        await room.localParticipant.unpublishTrack(track, true)
        // Hung up meanwhile: a camera started now would come on after the call has ended.
        // Switched off meanwhile — still on its way, or done already: it stays off.
        if (restart && this.cameraEnabled && !this.cameraOffPending && this.isLive(room)) {
          await room.localParticipant.setCameraEnabled(
            true,
            this.cameraDeviceId ? { deviceId: this.cameraDeviceId } : undefined,
          )
        }
      } catch (err) {
        if (this.isLive(room)) this.showDeviceErrorToast('camera', err)
      } finally {
        if (restart) this.deviceStarted('videoinput')
        if (this.cameraRenewal === renewal) this.cameraRenewal = null
        renewed()
        if (this.isLive(room)) {
          this.renewingCamera = false
          this.cameraEnabled = !!room.localParticipant.isCameraEnabled
          this.refreshTiles()
        }
      }
    },
    relieveOwnCamera() {
      const pub = this.room.localParticipant.getTrackPublication(this.Track.Source.Camera)
      const track = pub && pub.track
      if (!track || typeof track.prioritizePerformance !== 'function') return
      // Rejects when the track is not being sent (yet) — nothing to relieve then.
      track.prioritizePerformance().catch(() => {})
    },
    capCameraQuality(pub, quality) {
      // Not for a camera unsubscribed by audio-only mode: LiveKit refuses it,
      // and TrackSubscribed applies the cap once it is back.
      if (
        pub &&
        pub.source === this.Track.Source.Camera &&
        pub.isDesired !== false &&
        pub.setVideoQuality
      ) {
        pub.setVideoQuality(quality)
      }
    },
    startSenderStats() {
      this.stopSenderStats()
      this.senderStatsTimer = setInterval(() => this.readSenderStats(), SENDER_STATS_MS)
    },
    stopSenderStats() {
      if (this.senderStatsTimer) clearInterval(this.senderStatsTimer)
      this.senderStatsTimer = null
      this.sentVideo = null
    },
    // One reading at a time: under the very load the badge is for, one can outlast the interval,
    // and an older answer arriving last would undo a newer one.
    async readSenderStats() {
      if (this.senderStatsReading) return
      this.senderStatsReading = true
      try {
        await this.measureSentVideo()
      } finally {
        this.senderStatsReading = false
      }
    },
    async measureSentVideo() {
      const room = this.room
      const Track = this.Track
      if (!room || !Track) return
      const ownCamera = () => {
        const pub = room.localParticipant.getTrackPublication(Track.Source.Camera)
        return pub && pub.track
      }
      const track = ownCamera()
      if (!this.cameraEnabled || !track || typeof track.getSenderStats !== 'function') {
        this.setSentVideo(null)
        return
      }
      let stats
      try {
        stats = await track.getSenderStats()
      } catch {
        return
      }
      if (!this.isLive(room)) return
      // A camera renewed meanwhile is a new track: the answer is about the one before.
      if (ownCamera() !== track) return
      // One entry per simulcast layer; the largest one going out is what the others get at best.
      // A layer paused because nobody watches it (dynacast) is no limit, and its stats keep the
      // size of its last frame — the sender's own settings tell whether it is still on.
      const encodings = this.senderEncodings(track)
      const encodingOf = (layer) =>
        encodings.length === 1 ? encodings[0] : encodings.find((e) => e.rid && e.rid === layer.rid)
      const sending = (stats || []).filter(
        (layer) => layer.frameHeight > 0 && (encodingOf(layer) || {}).active !== false,
      )
      if (!sending.length) {
        // Nothing goes out right now: what would, as the sender is set up.
        this.setSentVideo(this.configuredVideo(track, encodings))
        return
      }
      // The reason, too, of the layer whose size the badge shows — not of another one.
      const top = sending.reduce((a, b) => (b.frameHeight > a.frameHeight ? b : a))
      const reason = top.qualityLimitationReason
      this.setSentVideo({
        height: top.frameHeight,
        fps: Math.round(top.framesPerSecond || 0),
        limitedBy: reason === 'cpu' || reason === 'bandwidth' ? reason : null,
      })
    },
    // Unchanged values keep the object: every new one renders the call and all its tiles anew,
    // every 3 s for as long as the call lasts.
    setSentVideo(next) {
      const prev = this.sentVideo
      const same =
        prev === next ||
        (!!prev &&
          !!next &&
          prev.height === next.height &&
          prev.fps === next.fps &&
          prev.limitedBy === next.limitedBy)
      if (!same) this.sentVideo = next
    },
    senderEncodings(track) {
      try {
        const sender = track.sender
        return (sender && sender.getParameters && sender.getParameters().encodings) || []
      } catch {
        return []
      }
    },
    // What our camera sends once someone watches it: what it captures, scaled down and capped in
    // frame rate by its largest layer. A layer switched off for good, like the ones the CPU
    // relief leaves aside, has a frame rate of 0; one only paused keeps its own.
    configuredVideo(track, encodings) {
      const media = track.mediaStreamTrack
      const settings = (media && media.getSettings && media.getSettings()) || {}
      if (!settings.height) return null
      const scaleOf = (encoding) => encoding.scaleResolutionDownBy || 1
      const top = encodings
        .filter((encoding) => encoding.maxFramerate !== 0)
        .reduce((a, b) => (a && scaleOf(a) <= scaleOf(b) ? a : b), null)
      const fps = Math.min(settings.frameRate || Infinity, (top && top.maxFramerate) || Infinity)
      return {
        height: Math.round(settings.height / (top ? scaleOf(top) : 1)),
        fps: Number.isFinite(fps) ? Math.round(fps) : 0,
        limitedBy: null,
      }
    },
    // Why a camera's video is lower than it could be, for the badge on its tile — or null. Only
    // what holds it back on purpose or for want: adaptive stream sizing a camera to its tile is
    // no limit. Screen shares are never lowered.
    qualityLimitOf(tile) {
      if (tile.isScreen) return null
      if (tile.isLocal) {
        const chosen = this.sendQuality === 'medium' || this.sendQuality === 'low'
        const reason =
          (this.sendRelieved && 'cpu') ||
          (this.sentVideo && this.sentVideo.limitedBy) ||
          (chosen && 'choice') ||
          null
        if (!reason) return null
        const sent = this.sentVideo
        return { reason, height: sent ? sent.height : null, fps: sent ? sent.fps : null }
      }
      // A camera we do not receive at all, by choice or for a weak line, looks like one switched
      // off at the other end — unless the tile says otherwise.
      if (tile.cameraHidden && this.videosOff) {
        return { reason: this.receiveQuality === 'audio' ? 'choice' : 'bandwidth', hidden: true }
      }
      const cap = this.VideoQuality ? this.receiveCap() : null
      if (cap === null || cap === this.VideoQuality.HIGH) return null
      return { reason: this.receiveRelieved ? 'cpu' : 'choice' }
    },
    uncapCameraQuality(pub) {
      // LiveKit cannot drop a cap, only raise it — to the top layer the camera
      // is sent in, so adaptiveStream keeps sizing it to its tile. That is HIGH
      // only when there is a HIGH layer: an SVC camera sent in two layers has
      // none, and a cap of HIGH would then ask for the largest layer outright.
      const { LOW, HIGH } = this.VideoQuality
      const layers = (pub && pub.trackInfo && pub.trackInfo.layers) || []
      const sent = layers.map((layer) => layer.quality).filter((q) => q >= LOW && q <= HIGH)
      this.capCameraQuality(pub, sent.length ? Math.max(...sent) : HIGH)
    },
    resetAudioOnly() {
      this.clearQualityTimer()
      this.qualityClass = null
      this.audioOnly = false
      this.audioOnlyDismissed = false
    },
    watchMicTrack(track, TrackEvent) {
      if (this.watchedMicTracks.has(track)) return
      this.watchedMicTracks.add(track)
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
      if (this.dtxSwitch) {
        await this.dtxSwitch
        // Left, or left and joined anew, meanwhile: this was asked of that call.
        if (!this.isLive(room)) return
      }
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
        // A fresh capture of a call that ended meanwhile: nobody else would stop it.
        if (this.releaseIfLeft(room, [track])) return
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
    // Called by the device settings' checkbox alone, which is disabled while a switch runs
    // (dtxApplying): one switch at a time.
    async setDtx(on) {
      const before = this.dtx
      this.dtxPreference = on
      const room = this.room
      const Track = this.Track
      if (!room || !Track) return
      // Every later publish of the microphone follows the room's defaults.
      room.options.publishDefaults.dtx = on
      const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
      const track = pub && pub.track
      if (!track) return
      // DTX is agreed on when a track is published, so the microphone has to be
      // published anew. The same track, unstopped: capture, mute state and our
      // listeners stay as they are.
      this.dtxApplying = true
      // Meanwhile the microphone has no publication. Switched on, restarted or moved to another
      // device, LiveKit would find none — and open a second capture, or act on nothing: those
      // wait for this. Muting acts on the track itself (see toggleMic).
      let settle
      const dtxSwitch = new Promise((resolve) => {
        settle = resolve
      })
      this.dtxSwitch = dtxSwitch
      this.dtxTrack = track
      const publish = (dtx) =>
        room.localParticipant.publishTrack(track, { source: Track.Source.Microphone, dtx })
      try {
        await room.localParticipant.unpublishTrack(track, false)
        if (this.room !== room) return
        try {
          await publish(on)
        } catch (err) {
          if (this.room !== room) return
          await this.restoreDtx(room, track, publish, before, err)
        }
      } catch (err) {
        if (this.room === room) this.showDeviceErrorToast('mic', err)
      } finally {
        if (this.dtxSwitch === dtxSwitch) this.dtxSwitch = null
        settle()
        if (this.room === room) {
          this.dtxApplying = false
          // A failed publish leaves the microphone off, and one muted meanwhile went out
          // muted — say so on the button.
          this.micEnabled = !!room.localParticipant.isMicrophoneEnabled
        }
      }
    },

    // The microphone could not be published with the new choice. Asked for a setting, the user
    // is not to lose their voice over it: the same track goes out again as it was, the choice
    // back where it was. Failing that, the track is stopped rather than left captured and
    // unheard — an open capture keeps a Bluetooth headset in its call mode, among others —
    // and the microphone shows as off, to be switched on again.
    async restoreDtx(room, track, publish, before, err) {
      this.dtxPreference = before
      room.options.publishDefaults.dtx = before
      try {
        await publish(before)
        if (this.room !== room) return
        if (this.$toast && typeof this.$toast.error === 'function') {
          this.$toast.error(this.$t('videoCall.deviceSettings.dtxFailed'))
        }
      } catch {
        track.stop()
        if (this.room === room) this.showDeviceErrorToast('mic', err)
      }
    },
    async toggleMic() {
      if (!this.room) return
      const next = !this.micEnabled
      // Muting while a dtx switch has the microphone unpublished: LiveKit would find nothing to
      // mute and the track go out again open. Muted on the track itself, at once, it goes out
      // muted.
      if (!next && this.dtxSwitch) {
        const room = this.room
        await this.dtxTrack.mute()
        if (this.room !== room) return
        this.micEnabled = false
        this.micProblem = false
        this.refreshMicMeter()
        return
      }
      const room = this.room
      if (next) this.deviceStarts('audioinput')
      try {
        if (this.dtxSwitch) {
          await this.dtxSwitch
          // Left, or left and joined anew, meanwhile: this was asked of that call.
          if (!this.isLive(room)) return
        }
        await room.localParticipant.setMicrophoneEnabled(next)
        // Hung up meanwhile: LiveKit takes care of the capture, the state is the next call's.
        if (!this.isLive(room)) return
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
        if (!this.isLive(room)) return
        this.micEnabled = !!room.localParticipant.isMicrophoneEnabled
        this.showDeviceErrorToast('mic', err)
      } finally {
        if (next) this.deviceStarted('audioinput')
      }
    },
    async toggleCamera() {
      if (!this.room) return
      const room = this.room
      const next = !this.cameraEnabled
      if (next) this.deviceStarts('videoinput')
      else this.cameraOffPending = true
      try {
        await room.localParticipant.setCameraEnabled(next)
        if (!this.isLive(room)) return
        this.cameraEnabled = next
        this.refreshTiles()
        if (next) this.refreshKnownDevices()
      } catch (err) {
        if (!this.isLive(room)) return
        this.cameraEnabled = !!room.localParticipant.isCameraEnabled
        this.refreshTiles()
        this.showDeviceErrorToast('camera', err)
      } finally {
        if (next) this.deviceStarted('videoinput')
        else this.cameraOffPending = false
      }
    },
    async toggleScreenShare() {
      if (!this.room || !this.screenShareSupported) return
      const room = this.room
      const next = !this.screenShareEnabled
      try {
        const publication = await room.localParticipant.setScreenShareEnabled(next, {
          audio: true,
        })
        if (!this.isLive(room)) return
        this.screenShareEnabled = next
        this.screenShareSurface = next
          ? publication?.track?.mediaStreamTrack?.getSettings?.().displaySurface || null
          : null
        this.refreshTiles()
      } catch (err) {
        if (!this.isLive(room)) return
        this.screenShareEnabled = !!room.localParticipant.isScreenShareEnabled
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
      // A quality chosen holds for this call only.
      this.sendQuality = 'auto'
      this.receiveQuality = 'auto'
      // Before the disconnect: a check must not resubscribe on a room going away.
      this.stopAudioWatchdog()
      this.stopSenderStats()
      // First, before the disconnect below is awaited: nothing may ask for the call's chat
      // any more once the call is being left.
      this.cancelCallChatRetry()
      // A connect() still waiting for its token must not join once this is through.
      this.connectAttempt++
      this.closingRoom = this.room
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
            const tracks = pubs.map((pub) => pub && pub.track)
            // A dtx switch holds the microphone unpublished for a moment: in no publication,
            // and running.
            if (this.dtxSwitch) tracks.push(this.dtxTrack)
            tracks.forEach(stopCapture)
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
      this.closingRoom = null
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
  /*  viewport (top: 0, bottom: 0) and sit at var(--z-index-call-maximized), one below */
  /*  var(--z-index-page-submenu). The page's own floating elements (the feed's "+" button, */
  /*  z-index 150) stay beneath the call, while the page header (.main-navigation) and the */
  /*  sticky footer (.ds-footer), both at var(--z-index-page-submenu) = 2500, stack on top — their own */
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
  z-index: var(--z-index-call-maximized);
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
  background: var(--video-surface);
  position: relative;
  min-height: 0;
}

.video-call__stage {
  flex: 1;
  min-width: 0;
  min-height: 0;
  /*  Anchors the notices and the button that brings the bars back. */
  position: relative;
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
  color: var(--video-on-media-color);
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
  border-left: 1px solid var(--border-color-softest);
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
  border-top: 1px solid var(--border-color-softest);
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
  background: var(--window-bar-background);
  border-bottom: 1px solid var(--border-color-softest);
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
  color: var(--video-on-media-color);
}

/*  Overlay like the speaker chips, but at the bottom: the body is a row */
/*  (stage | chat sidebar), so an in-flow banner would become a column. */
.video-call__notices {
  position: absolute;
  bottom: var(--space-x-small);
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - var(--space-base));
  z-index: 3;
}

/*  Each region is there all the time, an empty one without a box of its own. The gap */
/*  between them only where both have something to say. */
.video-call__notices-region {
  display: flex;
  flex-direction: column;
  gap: var(--space-xx-small);
}

.video-call__notices-region:not(:empty) + .video-call__notices-region:not(:empty) {
  margin-top: var(--space-xx-small);
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
  background: var(--window-bar-background);
  border-top: 1px solid var(--border-color-softest);
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
  background: var(--video-surface);
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
  background: var(--video-surface);
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
  background: var(--video-surface);
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

/*  Fullscreen: the page's header and footer are away for good, so the call's own bars */
/*  lie at the very top and bottom, and the chat beside the videos is as high as the */
/*  screen. */
.video-call--fullscreen {
  --header-height: 0px;
  --footer-height: 0px;
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

/*  The control bar's button to unfold them, as it looks there (a small filled button: 26px, */
/*  0.8px border, its icon 1.2em of 12px), at its distance from the right edge. A little */
/*  higher than it, off the window's lower edge, where it would stick to the corner. */
.video-call__parked-notices {
  z-index: 3;
  align-self: end;
  justify-self: end;
  margin: 0 var(--space-x-small) var(--space-x-small) 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 26px;
  height: 26px;
  border: 0.8px solid var(--color-warning);
  border-radius: var(--border-radius-rounded);
  font-size: 12px;
  color: var(--color-warning-contrast);
  background: var(--color-warning);
  transition: opacity 0.3s ease;
}

/*  The parked window's bar centres its buttons; this one keeps to its corner. */
.video-call__notices-toggle {
  position: absolute;
  top: 50%;
  right: var(--space-x-small);
  transform: translateY(-50%);
  display: flex;
}

.video-call--parked-bars:is(:has(:focus-visible), .video-call--bars-held)
  :is(.video-call__parked-count, .video-call__parked-notices) {
  opacity: 0;
}

/*  The parked window's notices, unfolded: in the corner of the button that unfolds them, */
/*  above the control bar while it shows (control bar of small buttons 31px, compact header */
/*  44px). Scrolling rather than running under the bars when the picture cannot hold them. */
.video-call--parked-bars .video-call__notices {
  bottom: var(--space-x-small);
  max-height: calc(100% - 2 * var(--space-x-small));
  overflow-y: auto;
  transition:
    bottom 0.3s ease,
    max-height 0.3s ease;
}

.video-call--parked-bars:is(:has(:focus-visible), .video-call--bars-held) .video-call__notices {
  bottom: calc(31px + var(--space-x-small));
  max-height: calc(100% - 44px - 31px - 2 * var(--space-x-small));
}

/*  Folded: out of sight, yet still in the accessibility tree, so that a warning is */
/*  announced all the same. Reached by the keyboard, they unfold for as long as it is in */
/*  them: an action is not to be focused unseen. */
.video-call__notices--collapsed:not(:focus-within) {
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .video-call--parked-bars .video-call__header,
  .video-call--parked-bars .video-call__controls,
  .video-call--parked-bars .video-call__notices,
  .video-call__parked-count,
  .video-call__parked-notices {
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
