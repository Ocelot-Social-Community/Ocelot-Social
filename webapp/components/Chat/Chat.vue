<template>
  <div>
    <client-only>
      <vue-advanced-chat
        :theme="theme"
        :current-user-id="currentUserId"
        :room-id="null"
        :template-actions="JSON.stringify(templatesText)"
        :menu-actions="JSON.stringify(menuActions)"
        :text-messages="JSON.stringify(textMessages)"
        :messages="JSON.stringify(messages)"
        :messages-loaded="messagesLoaded"
        :rooms="JSON.stringify(rooms)"
        :room-actions="JSON.stringify(roomActions)"
        :rooms-loaded="true"
        show-files="false"
        show-audio="false"
        :styles="JSON.stringify(computedChatStyle)"
        :show-footer="true"
        @send-message="sendMessage($event.detail[0])"
        @fetch-messages="fetchMessages($event.detail[0])"
        :responsive-breakpoint="responsiveBreakpoint"
        :single-room="singleRoom"
        @show-demo-options="showDemoOptions = $event"
      />
    </client-only>
  </div>
</template>

<script>
// import { roomQuery } from '~/graphql/Rooms'
import { messageQuery } from '~/graphql/Messages'
import chatStyle from '~/constants/chat.js'

export default {
  name: 'Chat',
  props: {
    theme: {
      type: String,
    },
    singleRoom: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      currentUserId: '1234',
      menuActions: [
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
      ],
      messageActions: [
        {
          name: 'addMessageToFavorite',
          title: 'Add To Favorite',
        },
        {
          name: 'shareMessage',
          title: 'Share Message',
        },
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
      textMessages: {
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
      },
      roomActions: [
        {
          name: 'archiveRoom',
          title: 'Archive Room',
        },
        { name: 'inviteUser', title: 'Invite User' },
        { name: 'removeUser', title: 'Remove User' },
        { name: 'deleteRoom', title: 'Delete Room' },
      ],
      rooms: [
        {
          roomId: '1',
          roomName: 'John Snow',
          avatar: 'https://66.media.tumblr.com/avatar_c6a8eae4303e_512.pnj',
          users: [
            { _id: '1234', username: 'John Doe' },
            { _id: '4321', username: 'John Snow' },
          ],
        },
        {
          roomId: '2',
          roomName: 'Max J. Mustermann',
          avatar:
            'https://64.media.tumblr.com/8889b6e26370f4e3837584c1c59721a6/f4f76ed6b0249d08-4b/s1280x1920/810e9e5fa724366d26c10c0fa22ba97dad8778d1.pnj',
          users: [
            { _id: '1234', username: 'Johnx Doe' },
            { _id: '43210', username: 'Max J. Mustermann' },
          ],
        },
      ],
      messages: [],
      messagesLoaded: true,
      showDemoOptions: true,
      responsiveBreakpoint: 600,
    }
  },

  computed: {
    computedChatStyle() {
      // TODO light/dark theme still needed?
      // return this.theme === 'light' ? chatStyle.STYLE.light : chatStyle.STYLE.dark
      return chatStyle.STYLE.light
    },
  },
  methods: {
    fetchMessages({ room, options = {} }) {
      // console.log(room, options)
      this.messagesLoaded = false
      setTimeout(async () => {
        if (options.reset) {
          // console.log('reset messages')
          this.messages = [] // this.addMessages(true)
        } else {
          try {
            const {
              data: { Message },
            } = await this.$apollo.query({
              query: messageQuery(),
              variables: {
                roomId: room.id,
              },
            })
            // console.log('Messages', Message)
            this.messages = Message
          } catch (error) {
            // console.log('Error', error)
            this.messages = [] // this.addMessages(true)
            this.$toast.error(error.message)
          }
        }
        this.messagesLoaded = true
      })
    },

    /* addMessages(reset) {
      const messages = []

      for (let i = 0; i < 30; i++) {
        messages.push({
          _id: reset ? i : this.messages.length + i,
          content: `${reset ? '' : 'paginated'} message ${i + 1}`,
          senderId: '4321',
          username: 'John Doe',
          date: '13 November',
          timestamp: '10:20',
        })
      }
      messages.push({
        _id: '31',
        content: `Hallo Welt`,
        senderId: '1234',
        username: 'John Doe',
        date: '13 November',
        timestamp: '10:20',
      })

      return messages
    }, */

    sendMessage(message) {
      this.messages = [
        ...this.messages,
        {
          _id: this.messages.length,
          content: message.content,
          senderId: this.currentUserId,
          timestamp: new Date().toString().substring(16, 21),
          date: new Date().toDateString(),
        },
      ]
    },

    addNewMessage() {
      setTimeout(() => {
        this.messages = [
          ...this.messages,
          {
            _id: this.messages.length,
            content: 'NEW MESSAGE',
            senderId: '1234',
            timestamp: new Date().toString().substring(16, 21),
            date: new Date().toDateString(),
          },
        ]
      }, 2000)
    },
  },
  //   apollo: {
  //     Rooms: {
  //       query() {
  //         return roomQuery()
  //       },
  //       update({ Room }) {
  //         console.log('Rooms', Room)
  //         if (!Room) {
  //           this.rooms = []
  //           return
  //         }
  //         this.rooms = Room
  //       },
  //       error(error) {
  //         this.rooms = []
  //         this.$toast.error(error.message)
  //       },
  //       fetchPolicy: 'cache-and-network',
  //     },
  //   },
}
</script>
<style lang="scss">
body {
  font-family: 'Quicksand', sans-serif;
}
</style>
