<template>
  <div class="layout-default">
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
        switch between them, as they do in the call's own sidebar.
      -->
      <div v-if="showCallChatTabs" class="chat-modul__tabs">
        <call-chat-tabs />
      </div>
      <client-only>
        <chat
          :key="getShowChat.roomId || getShowChat.groupId || getShowChat.chatUserId"
          singleRoom
          :reservedHeight="showCallChatTabs ? CALL_CHAT_TABS_HEIGHT : 0"
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
import Chat from '~/components/Chat/Chat.vue'
import CallChatTabs from '~/components/VideoCall/CallChatTabs.vue'
import { activeCallChatTab } from '~/components/VideoCall/callChat'
import VideoCall from '~/components/VideoCall/VideoCall.vue'
import { videoCallConfigQuery } from '~/graphql/VideoCalls'

// Height of the tab row above the floating chat, in px. The chat is told, so it gives up
// that much and the window does not grow under the page header. Kept in step with the
// `.chat-modul__tabs` rule below.
const CALL_CHAT_TABS_HEIGHT = 52

export default {
  components: {
    HeaderMenu,
    PageFooter,
    Chat,
    CallChatTabs,
    VideoCall,
  },
  data() {
    return { CALL_CHAT_TABS_HEIGHT }
  },
  mixins: [seo, mobile()],
  computed: {
    ...mapGetters({
      getShowChat: 'chat/showChat',
      showVideoCall: 'videoCall/showVideoCall',
      videoCallMinimized: 'videoCall/minimized',
      videoCallGroupId: 'videoCall/groupId',
      videoCallPhase: 'videoCall/phase',
      videoCallChatRoomId: 'videoCall/chatRoomId',
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
    showCallChatTabs() {
      // Only where there is a choice: in a call whose conference chat the server has
      // confirmed, and for a chat that is one of the call's two.
      return (
        this.showVideoCall &&
        this.videoCallPhase === 'in-call' &&
        !!this.videoCallChatRoomId &&
        activeCallChatTab(this.getShowChat, {
          groupId: this.videoCallGroupId,
          chatRoomId: this.videoCallChatRoomId,
        }) !== null
      )
    },
    chatRenderedElsewhere() {
      // Don't draw the floating chat-modul when the chat is already shown by
      // some other surface: the maximized chat page (/chat) or the video
      // call's sidebar.
      return this.chatLivesInVideoSidebar || this.$route.name === 'chat'
    },
  },
  watch: {
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
/*  The tabs between the two chats of a running call. Height fixed, as the chat below is */
/*  told how much room they take (CALL_CHAT_TABS_HEIGHT). */
.chat-modul__tabs {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 52px;
  padding: 0 var(--space-small);
  background: var(--background-color-base);
  border-bottom: 1px solid var(--color-neutral-85);
}

.chat-modul--with-video {
  bottom: 333px; /*  45 (video bottom) + 280 (video height) + 8 (gap) */
}
</style>
