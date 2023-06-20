 <script setup>
import { register } from 'vue-advanced-chat'
register()
//  import { register } from 'vue-advanced-chat/dist/vue-advanced-chat.es.js'
//  window['vue-advanced-chat'].register()
</script>
<template>
  <div>
    <internal-page :pageParams="pageParams" />
    <vue-advanced-chat
      :current-user-id="currentUserId"
      :template-actions="JSON.stringify(templatesText)"
      :text-messages="JSON.stringify(textMessages)"
      :menu-actions="JSON.stringify(menuActions)"
      :rooms="JSON.stringify(rooms)"
      :messages="JSON.stringify(messages)"
      :room-actions="JSON.stringify(roomActions)"
      :rooms-loaded="true"
      show-files="false"
      show-audio="false"
      :show-footer="true"
      :messages-loaded="messagesLoaded"
      @send-message="sendMessage($event.detail[0])"
      @fetch-messages="fetchMessages($event.detail[0])"
      :theme="theme"
      :is-device="isDevice"
      @show-demo-options="showDemoOptions = $event"
    />
    <base-button @click="theme = theme === 'light' ? 'dark' : 'light'">
      change style mode
    </base-button>
  </div>
</template>

<script>
import links from '~/constants/links.js'
import { internalPageMixins } from '~/mixins/internalPageMixins'
import BaseButton from '../components/_new/generic/BaseButton/BaseButton.vue'

export default {
  components: { BaseButton },
  mixins: [internalPageMixins(links.CHAT)],

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
        ROOMS_EMPTY: 'Aucune conversation',
        ROOM_EMPTY: 'Aucune conversation sélectionnée',
        NEW_MESSAGES: 'Nouveaux messages',
        MESSAGE_DELETED: 'Ce message a été supprimé',
        MESSAGES_EMPTY: 'Aucun message',
        CONVERSATION_STARTED: 'La conversation a commencée le :',
        TYPE_MESSAGE: 'Tapez votre message',
        SEARCH: 'Rechercher',
        IS_ONLINE: 'est en ligne',
        LAST_SEEN: 'dernière connexion ',
        IS_TYPING: 'est en train de taper...',
        CANCEL_SELECT_MESSAGE: 'Annuler Sélection',
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
      messagesLoaded: false,
      showDemoOptions: true,
      isDevice: true,
      theme: 'light',
    }
  },

  methods: {
    fetchMessages({ options = {} }) {
      setTimeout(() => {
        if (options.reset) {
          this.messages = this.addMessages(true)
        } else {
          this.messages = [...this.addMessages(), ...this.messages]
          this.messagesLoaded = true
        }
        // this.addNewMessage()
      })
    },

    addMessages(reset) {
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
    },

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
}
</script>
<style lang="scss">
body {
  font-family: 'Quicksand', sans-serif;
}
</style>
