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
      v-if="getShowChat.showChat && !isMobile && !chatLivesInVideoSidebar"
      :class="['chat-modul', { 'chat-modul--with-video': showVideoCall && videoCallMinimized }]"
    >
      <client-only>
        <chat
          singleRoom
          :userId="getShowChat.chatUserId"
          :groupId="getShowChat.groupId"
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
import VideoCall from '~/components/VideoCall/VideoCall.vue'
import { videoCallConfigQuery } from '~/graphql/VideoCalls'

export default {
  components: {
    HeaderMenu,
    PageFooter,
    Chat,
    VideoCall,
  },
  mixins: [seo, mobile()],
  computed: {
    ...mapGetters({
      getShowChat: 'chat/showChat',
      showVideoCall: 'videoCall/showVideoCall',
      videoCallMinimized: 'videoCall/minimized',
    }),
    chatLivesInVideoSidebar() {
      // While the call is on its dedicated route (maximized), the chat is
      // rendered inside the call's sidebar instead of the floating chat-modul.
      return (
        this.showVideoCall &&
        !this.videoCallMinimized &&
        this.$route.name === 'call-id-slug'
      )
    },
  },
  watch: {
    'getShowChat.showChat'(open) {
      if (open && this.isMobile) {
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
      fetchPolicy: 'cache-first',
    },
  },
}
</script>

<style lang="scss">
.main-navigation {
  background-color: $color-header-background;
}
.main-container {
  padding-top: 6rem;
  padding-bottom: 8rem;
}

@media (max-width: 810px) {
  .main-container {
    padding-top: 4rem;
    padding-bottom: $space-x-small;
  }

  .desktop-footer {
    display: none;
  }

  .ds-container {
    padding-left: $space-x-small !important;
    padding-right: $space-x-small !important;
  }
}

.chat-modul {
  background-color: rgb(233, 228, 228);
  width: 355px;
  position: fixed;
  bottom: 45px;
  right: 0;
  // Below the global tooltip/popover stack ($z-index-modal - 2 = 9997) so header
  // dropdowns (avatar menu, notifications) remain clickable on top of the chat.
  z-index: $z-index-overlay;
  .close {
    padding: 10px;
    color: blue;
    cursor: pointer;
  }
}

// When a minimized video call is anchored above the footer, lift the chat
// above the video so both fit without overlap. Minimized video sits at
// bottom: 45px (matching the chat's footer offset) and is 280px tall.
// The inner chat content keeps its own height; whatever extends above the
// viewport gets clipped by the browser, leaving the message input and the
// latest messages visible — which is what the user interacts with.
.chat-modul--with-video {
  bottom: 333px; // 45 (video bottom) + 280 (video height) + 8 (gap)
}
</style>
