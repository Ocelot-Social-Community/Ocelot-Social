<template>
  <div
    :class="[
      'layout-default',
      {
        'layout-default--call-bars-movable': videoCallPageBars !== 'normal',
        'layout-default--call-bars-glass': ['overlay', 'hidden'].includes(videoCallPageBars),
        'layout-default--call-bars-away': ['hidden', 'collapsed'].includes(videoCallPageBars),
      },
    ]"
  >
    <div class="main-navigation">
      <header-menu />
    </div>
    <div class="ds-container ds-container-x-large">
      <div class="main-container">
        <nuxt />
      </div>
    </div>
    <page-footer class="desktop-footer" />
    <div id="overlay" />
    <div
      v-if="getShowChat.showChat && !isMobile && !chatRenderedElsewhere"
      :class="['chat-modul', { 'chat-modul--with-video': showVideoCall && videoCallMinimized }]"
    >
      <!--
        Beside a parked call the window shows one of the call's two chats; the tabs
        switch between them, as they do in the call's own sidebar. The header sits above
        them — first where one is, then the choice — which is why it is drawn here: the
        chat's own header is part of the chat and cannot have anything put below it.
      -->
      <template v-if="showCallChatTabs">
        <room-header
          class="chat-modul__header"
          compact
          :profile="callGroupProfile"
          :title="videoCallGroupName || ''"
          :to="callGroupRoute"
          show-group-icon
        >
          <!-- No larger view for the call's conference chat: it is reached from the call only. -->
          <os-button
            v-if="callChatTab === 'group'"
            data-test="chat-modul-expand"
            as="nuxt-link"
            :to="{ name: 'chat', query: { groupId: videoCallGroupId } }"
            variant="primary"
            appearance="outline"
            circle
            size="sm"
            :aria-label="$t('chat.expandChat')"
          >
            <template #icon>
              <os-icon :icon="icons.expand" />
            </template>
          </os-button>
          <os-button
            data-test="chat-modul-close"
            variant="primary"
            appearance="outline"
            circle
            size="sm"
            :aria-label="$t('chat.closeChat')"
            @click="closeSingleRoom"
          >
            <template #icon>
              <os-icon :icon="icons.close" />
            </template>
          </os-button>
        </room-header>
        <div class="chat-modul__tabs">
          <call-chat-tabs
            exportable
            :exporting="chatExporting"
            :exportEmpty="chatEmpty"
            @export="exportChat"
          />
        </div>
      </template>
      <client-only>
        <chat
          ref="chat"
          :key="getShowChat.roomId || getShowChat.groupId || getShowChat.chatUserId"
          singleRoom
          :hideHeader="showCallChatTabs"
          :hint="callChatHint"
          :hintKey="showCallChatTabs ? 'call-chat-' + callChatTab : null"
          @empty-change="chatEmpty = $event"
          :reservedHeight="showCallChatTabs ? CALL_CHAT_TABS_HEIGHT + CALL_CHAT_HEADER_HEIGHT : 0"
          :userId="getShowChat.chatUserId"
          :groupId="getShowChat.groupId"
          :roomId="getShowChat.roomId"
          @close-single-room="closeSingleRoom"
        />
      </client-only>
    </div>
    <client-only>
      <video-call v-if="showVideoCall" />
    </client-only>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import seo from '~/mixins/seo'
import mobile from '~/mixins/mobile'
import HeaderMenu from '~/components/HeaderMenu/HeaderMenu'
import PageFooter from '~/components/PageFooter/PageFooter'
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import Chat from '~/components/Chat/Chat.vue'
import RoomHeader from '~/components/_new/generic/RoomHeader/RoomHeader.vue'
import CallChatTabs from '~/components/VideoCall/CallChatTabs.vue'
import { activeCallChatTab } from '~/components/VideoCall/callChat'
import VideoCall from '~/components/VideoCall/VideoCall.vue'
import { videoCallConfigQuery } from '~/graphql/VideoCalls'

// Height of the tab row above the floating chat, in px. The chat is told, so it gives up
// that much and the window does not grow under the page header. Kept in step with the
// `.chat-modul__tabs` rule below.
const CALL_CHAT_TABS_HEIGHT = 36
// Height of the room header above those tabs, in px: RoomHeader's compact one, which is its
// small avatar (28) with a small space (8) above and below.
const CALL_CHAT_HEADER_HEIGHT = 44

export default {
  components: {
    HeaderMenu,
    PageFooter,
    Chat,
    CallChatTabs,
    RoomHeader,
    OsButton,
    OsIcon,
    VideoCall,
  },
  data() {
    return {
      CALL_CHAT_TABS_HEIGHT,
      CALL_CHAT_HEADER_HEIGHT,
      chatExporting: false,
      // Whether the chat in the window is known to hold no message (see Chat.vue). Reset with
      // every chat put there, which then reports anew.
      chatEmpty: false,
    }
  },
  created() {
    this.icons = iconRegistry
  },
  mixins: [seo, mobile()],
  computed: {
    ...mapGetters({
      getShowChat: 'chat/showChat',
      showVideoCall: 'videoCall/showVideoCall',
      videoCallMinimized: 'videoCall/minimized',
      videoCallGroupId: 'videoCall/groupId',
      videoCallGroupName: 'videoCall/groupName',
      videoCallGroupSlug: 'videoCall/groupSlug',
      videoCallGroupAvatar: 'videoCall/groupAvatar',
      videoCallPhase: 'videoCall/phase',
      videoCallChatRoomId: 'videoCall/chatRoomId',
      videoCallPageBars: 'videoCall/pageBars',
    }),
    chatLivesInVideoSidebar() {
      // Move the chat into the call's sidebar **only when the chat is for the
      // very same group as the video call** — or is the call's own conference
      // chat. Otherwise (different group or no group, e.g. user chat) keep the
      // floating chat-modul so the user doesn't lose their conversation when
      // the video gets maximized.
      // The phase check (instead of a route check) lets the modul → sidebar
      // hand-off happen in the same reactive tick as the maximize click,
      // avoiding a brief moment with two chats visible side by side.
      return (
        this.showVideoCall &&
        // A phone has no parked call window: the call is always full screen there.
        (!this.videoCallMinimized || this.isMobile) &&
        (this.videoCallPhase === 'in-call' || this.videoCallPhase === 'connecting') &&
        ((!!this.getShowChat.groupId && this.getShowChat.groupId === this.videoCallGroupId) ||
          (!!this.getShowChat.roomId && this.getShowChat.roomId === this.videoCallChatRoomId))
      )
    },
    // Which of the running call's two chats the window shows: 'call', 'group', or null
    // for any other chat.
    callChatTab() {
      return activeCallChatTab(this.getShowChat, {
        groupId: this.videoCallGroupId,
        chatRoomId: this.videoCallChatRoomId,
      })
    },
    showCallChatTabs() {
      // Only where there is a choice: in a call whose conference chat the server has
      // confirmed, and for a chat that is one of the call's two.
      return (
        this.showVideoCall &&
        this.videoCallPhase === 'in-call' &&
        !!this.videoCallChatRoomId &&
        this.callChatTab !== null
      )
    },
    // The hint above the messages, for the two chats of a running call only: the same as
    // the hint on their tabs. A chat outside a call has nothing to be told apart from.
    callChatHint() {
      if (!this.showCallChatTabs) return null
      return this.callChatTab === 'call'
        ? this.$t('videoCall.chatTabs.callHint')
        : this.$t('videoCall.chatTabs.groupHint')
    },
    // Both of the call's chats are the group's, so the header above them names the group —
    // as the call's own header does.
    callGroupProfile() {
      return {
        id: this.videoCallGroupId,
        name: this.videoCallGroupName || this.videoCallGroupSlug || '',
        avatar: this.videoCallGroupAvatar,
      }
    },
    callGroupRoute() {
      if (!this.videoCallGroupId || !this.videoCallGroupSlug) return null
      return {
        name: 'groups-id-slug',
        params: { id: this.videoCallGroupId, slug: this.videoCallGroupSlug },
      }
    },
    chatRenderedElsewhere() {
      // Don't draw the floating chat-modul when the chat is already shown by
      // some other surface: the maximized chat page (/chat) or the video
      // call's sidebar.
      return this.chatLivesInVideoSidebar || this.$route.name === 'chat'
    },
  },
  watch: {
    'getShowChat.roomId'() {
      this.chatEmpty = false
    },
    'getShowChat.groupId'() {
      this.chatEmpty = false
    },
    'getShowChat.showChat'(open) {
      // On a phone a chat opens on the chat page — except the chats of the call one is
      // in, which the call shows itself, below the video.
      if (open && this.isMobile && !this.chatLivesInVideoSidebar) {
        const { chatUserId, groupId } = this.getShowChat
        const query = {}
        if (chatUserId) query.userId = chatUserId
        if (groupId) query.groupId = groupId
        this.showChat({ showChat: false, chatUserId: null, groupId: null })
        if (this.$route.path === '/chat') {
          // Already on chat page — update query to trigger openFromQuery watcher
          this.$router.replace({ path: '/chat', query })
        } else {
          this.$router.push({ path: '/chat', query })
        }
      }
    },
  },
  methods: {
    ...mapMutations({
      showChat: 'chat/SET_OPEN_CHAT',
      setVideoCallEnabled: 'videoCall/SET_ENABLED',
    }),
    closeSingleRoom() {
      this.showChat({ showChat: false, chatUserId: null, groupId: null })
    },
    // The export is the chat's own doing; only its button sits in the header drawn here.
    async exportChat() {
      const chat = this.$refs.chat
      if (!chat || this.chatExporting) return
      this.chatExporting = true
      try {
        await chat.exportRoom()
      } finally {
        this.chatExporting = false
      }
    },
  },
  beforeCreate() {
    this.$store.commit('chat/SET_OPEN_CHAT', { showChat: false, chatUserId: null, groupId: null })
  },
  apollo: {
    videoCallConfig: {
      query() {
        return videoCallConfigQuery()
      },
      result({ data }) {
        if (data && data.videoCallConfig) {
          this.setVideoCallEnabled(data.videoCallConfig.enabled)
        }
      },
      error(err) {
        // eslint-disable-next-line no-console
        console.warn('videoCallConfig query failed:', err)
      },
      fetchPolicy: 'cache-first',
    },
  },
}
</script>

<style>
.main-navigation {
  background-color: var(--color-header-background);
}

/*  Beside a maximized video call header and footer move out of the way with the call's own */
/*  bars: on a phone after a while without a touch, lying on the call see-through (glass), */
/*  on a desktop when the user asks to, solid (VideoCall.vue, barsOverlay / barsManual). */
.layout-default--call-bars-movable .main-navigation,
.layout-default--call-bars-movable .desktop-footer.ds-footer {
  transition: transform 0.3s ease;
}

.layout-default--call-bars-glass .main-navigation,
.layout-default--call-bars-glass .desktop-footer.ds-footer {
  backdrop-filter: blur(var(--video-call-bar-blur));
}

.layout-default--call-bars-glass .main-navigation {
  background-color: color-mix(
    in srgb,
    var(--video-call-bar-page-header-color) var(--video-call-bar-opacity),
    transparent
  );
}

.layout-default--call-bars-glass .desktop-footer.ds-footer {
  background-color: color-mix(
    in srgb,
    var(--video-call-bar-page-footer-color) var(--video-call-bar-opacity),
    transparent
  );
}

.layout-default--call-bars-away .main-navigation {
  transform: translateY(-100%);
  box-shadow: none;
}

.layout-default--call-bars-away .desktop-footer.ds-footer {
  transform: translateY(100%);
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .layout-default--call-bars-movable .main-navigation,
  .layout-default--call-bars-movable .desktop-footer.ds-footer {
    transition: none;
  }
}
.main-container {
  padding-top: 6rem;
  padding-bottom: 8rem;
}

@media (--vp-mobile) {
  .main-container {
    padding-top: 4rem;
    padding-bottom: var(--space-x-small);
  }

  .desktop-footer {
    display: none;
  }

  .ds-container {
    padding-left: var(--space-x-small) !important;
    padding-right: var(--space-x-small) !important;
  }
}

.chat-modul {
  background-color: rgb(233, 228, 228);
  width: 355px;
  position: fixed;
  bottom: 45px;
  right: 0;
  /*  Below the global tooltip/popover stack (var(--z-index-modal) - 2 = 9997) so header */
  /*  dropdowns (avatar menu, notifications) remain clickable on top of the chat. */
  z-index: var(--z-index-overlay);
  .close {
    padding: 10px;
    color: blue;
    cursor: pointer;
  }
}

/*  When a minimized video call is anchored above the footer, lift the chat */
/*  above the video so both fit without overlap. Minimized video sits at */
/*  bottom: 45px (matching the chat's footer offset) and is 280px tall. */
/*  The inner chat content keeps its own height; whatever extends above the */
/*  viewport gets clipped by the browser, leaving the message input and the */
/*  latest messages visible — which is what the user interacts with. */
/*  The tabs between the two chats of a running call, below the room's header. Their */
/*  height is fixed, as the chat below is told how much room the two take */
/*  (CALL_CHAT_TABS_HEIGHT; the header's is RoomHeader's compact one, CALL_CHAT_HEADER_HEIGHT). */
.chat-modul__tabs {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 36px;
  /*  The tabs reach from edge to edge of the window, their underline with them. */
  padding: 0;
  background: var(--background-color-base);
  border-bottom: 1px solid var(--color-neutral-85);
}

.chat-modul--with-video {
  bottom: 333px; /*  45 (video bottom) + 280 (video height) + 8 (gap) */
}
</style>
