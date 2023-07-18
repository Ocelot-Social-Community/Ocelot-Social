<template>
  <div>
    <client-only>
      <vue-advanced-chat
        :theme="theme"
        :current-user-id="currentUser.id"
        :room-id="!singleRoom ? roomId : null"
        :template-actions="JSON.stringify(templatesText)"
        :menu-actions="JSON.stringify(menuActions)"
        :text-messages="JSON.stringify(textMessages)"
        :message-actions="messageActions"
        :messages="JSON.stringify(messages)"
        :messages-loaded="messagesLoaded"
        :rooms="JSON.stringify(rooms)"
        :room-actions="JSON.stringify(roomActions)"
        :rooms-loaded="roomsLoaded"
        :loading-rooms="loadingRooms"
        show-files="false"
        show-audio="false"
        :styles="JSON.stringify(computedChatStyle)"
        :show-footer="true"
        @send-message="sendMessage($event.detail[0])"
        @fetch-messages="fetchMessages($event.detail[0])"
        @fetch-more-rooms="fetchRooms"
        :responsive-breakpoint="responsiveBreakpoint"
        :single-room="singleRoom"
        show-reaction-emojis="false"
        @show-demo-options="showDemoOptions = $event"
      >
        <div slot="menu-icon" @click.prevent.stop="$emit('close-single-room', true)">
          <div v-if="singleRoom">
            <ds-icon name="close"></ds-icon>
          </div>
        </div>

        <div slot="room-header-avatar">
          <div
            v-if="selectedRoom && selectedRoom.avatar && selectedRoom.avatar !== 'default-avatar'"
            class="vac-avatar"
            :style="{ 'background-image': `url('${selectedRoom.avatar}')` }"
          />
          <div v-else-if="selectedRoom" class="vac-avatar">
            <span class="initials">{{ getInitialsName(selectedRoom.roomName) }}</span>
          </div>
        </div>

        <div v-for="room in rooms" :slot="'room-list-avatar_' + room.id" :key="room.id">
          <div
            v-if="room.avatar && room.avatar !== 'default-avatar'"
            class="vac-avatar"
            :style="{ 'background-image': `url('${room.avatar}')` }"
          />
          <div v-else class="vac-avatar">
            <span class="initials">{{ getInitialsName(room.roomName) }}</span>
          </div>
        </div>
      </vue-advanced-chat>
    </client-only>
  </div>
</template>

<script>
import { roomQuery, createRoom, unreadRoomsQuery } from '~/graphql/Rooms'
import { messageQuery, createMessageMutation, markMessagesAsSeen } from '~/graphql/Messages'
import chatStyle from '~/constants/chat.js'
import { mapGetters, mapMutations } from 'vuex'

export default {
  name: 'Chat',
  props: {
    theme: {
      type: String,
      default: 'light',
    },
    singleRoom: {
      type: Boolean,
      default: false,
    },
    roomId: {
      type: String,
      default: null,
    },
  },
  data() {
    // Wolle console.log('this.singleRoom: ', this.singleRoom)
    // console.log('this.roomId: ', this.roomId)
    return {
      menuActions: [
        // NOTE: if menuActions is empty, the related slot is not shown
        {
          name: 'dummyItem',
          title: 'Just a dummy item',
        },
        /*
            {
            name: 'inviteUser',
            title: 'Invite User',
            },
            {
            name: 'removeUser',
            title: 'Remove User',
            },
            {
            name: 'deleteRoom',
            title: 'Delete Room',
            },
          */
      ],
      messageActions: [
        /*
            {
            name: 'addMessageToFavorite',
            title: 'Add To Favorite',
            },
            {
            name: 'shareMessage',
            title: 'Share Message',
            },
          */
      ],
      templatesText: [
        {
          tag: 'help',
          text: 'This is the help',
        },
        {
          tag: 'action',
          text: 'This is the action',
        },
      ],
      roomActions: [
        /*
            {
            name: 'archiveRoom',
            title: 'Archive Room',
            },
            { name: 'inviteUser', title: 'Invite User' },
            { name: 'removeUser', title: 'Remove User' },
            { name: 'deleteRoom', title: 'Delete Room' },
          */
      ],

      showDemoOptions: true,
      responsiveBreakpoint: 600,
      rooms: [],
      roomsLoaded: false,
      roomPage: 0,
      roomPageSize: 10,
      selectedRoom: this.roomId,
      loadingRooms: true,
      messagesLoaded: false,
      messagePage: 0,
      messagePageSize: 20,
      messages: [],
    }
  },
  mounted() {
    if (this.singleRoom) {
      this.$apollo
        .mutate({
          mutation: createRoom(),
          variables: {
            userId: this.roomId,
          },
        })
        .then(({ data: { CreateRoom } }) => {
          this.fetchRooms({ room: CreateRoom })
        })
        .catch((error) => {
          this.$toast.error(error)
        })
        .finally(() => {
          // this.loading = false
        })
    } else {
      this.fetchRooms()
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    computedChatStyle() {
      return chatStyle.STYLE.light
    },
    textMessages() {
      return {
        ROOMS_EMPTY: this.$t('chat.roomsEmpty'),
        ROOM_EMPTY: this.$t('chat.roomEmpty'),
        NEW_MESSAGES: this.$t('chat.newMessages'),
        MESSAGE_DELETED: this.$t('chat.messageDeleted'),
        MESSAGES_EMPTY: this.$t('chat.messagesEmpty'),
        CONVERSATION_STARTED: this.$t('chat.conversationStarted'),
        TYPE_MESSAGE: this.$t('chat.typeMessage'),
        SEARCH: this.$t('chat.search'),
        IS_ONLINE: this.$t('chat.isOnline'),
        LAST_SEEN: this.$t('chat.lastSeen'),
        IS_TYPING: this.$t('chat.isTyping'),
        CANCEL_SELECT_MESSAGE: this.$t('chat.cancelSelectMessage'),
      }
    },
  },
  methods: {
    ...mapMutations({
      commitUnreadRoomCount: 'chat/UPDATE_ROOM_COUNT',
    }),
    async fetchRooms({ room } = {}) {
      this.roomsLoaded = false
      const offset = this.roomPage * this.roomPageSize
      try {
        const {
          data: { Room },
        } = await this.$apollo.query({
          query: roomQuery(),
          variables: {
            id: room?.id,
            first: this.roomPageSize,
            offset,
          },
          fetchPolicy: 'no-cache',
        })

        const newRooms = Room.map((r) => {
          return {
            ...r,
            users: r.users.map((u) => {
              return { ...u, username: u.name, avatar: u.avatar?.url }
            }),
          }
        })

        this.rooms = [...this.rooms, ...newRooms]

        if (Room.length < this.roomPageSize) {
          this.roomsLoaded = true
        }
        this.roomPage += 1
      } catch (error) {
        this.rooms = []
        this.$toast.error(error.message)
      }
      // must be set false after initial rooms are loaded and never changed again
      this.loadingRooms = false
    },

    async fetchMessages({ room, options = {} }) {
      if (this.selectedRoom?.id !== room.id) {
        this.messages = []
        this.messagePage = 0
        this.selectedRoom = room
      }
      this.messagesLoaded = options.refetch ? this.messagesLoaded : false
      const offset = (options.refetch ? 0 : this.messagePage) * this.messagePageSize
      try {
        const {
          data: { Message },
        } = await this.$apollo.query({
          query: messageQuery(),
          variables: {
            roomId: room.id,
            first: this.messagePageSize,
            offset,
          },
          fetchPolicy: 'no-cache',
        })

        const newMsgIds = Message.filter((m) => m.seen === false).map((m) => m.id)
        if (newMsgIds.length) {
          this.$apollo
            .mutate({
              mutation: markMessagesAsSeen(),
              variables: {
                messageIds: newMsgIds,
              },
            })
            .then(() => {
              this.$apollo
                .query({
                  query: unreadRoomsQuery(),
                  fetchPolicy: 'network-only',
                })
                .then(({ data: { UnreadRooms } }) => {
                  this.commitUnreadRoomCount(UnreadRooms)
                })
            })
        }

        const msgs = []
        ;[...this.messages, ...Message].forEach((m) => {
          if (m.senderId !== this.currentUser.id) m.seen = true
          m.date = new Date(m.date).toDateString()
          msgs[m.indexId] = m
        })
        this.messages = msgs.filter(Boolean)

        if (Message.length < this.messagePageSize) {
          this.messagesLoaded = true
        }
        this.messagePage += 1
      } catch (error) {
        this.messages = []
        this.$toast.error(error.message)
      }
    },

    async sendMessage(message) {
      // check for usersTag and change userid to username
      message.usersTag.forEach((userTag) => {
        const needle = `<usertag>${userTag.id}</usertag>`
        const replacement = `<usertag>@${userTag.name.replaceAll(' ', '-').toLowerCase()}</usertag>`
        message.content = message.content.replaceAll(needle, replacement)
      })
      try {
        await this.$apollo.mutate({
          mutation: createMessageMutation(),
          variables: {
            roomId: message.roomId,
            content: message.content,
          },
        })
      } catch (error) {
        this.$toast.error(error.message)
      }
      this.fetchMessages({
        room: this.rooms.find((r) => r.roomId === message.roomId),
        options: { refetch: true },
      })
    },

    getInitialsName(fullname) {
      if (!fullname) return
      return fullname.match(/\b\w/g).join('').substring(0, 3).toUpperCase()
    },
  },
}
</script>
<style lang="scss">
body {
  font-family: 'Quicksand', sans-serif;
}
.vac-avatar {
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  background-color: $color-primary-dark;
  color: $text-color-primary-inverse;
  height: 42px;
  width: 42px;
  min-height: 42px;
  min-width: 42px;
  margin-right: 15px;
  border-radius: 50%;
  position: relative;

  > .initials {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}
</style>
