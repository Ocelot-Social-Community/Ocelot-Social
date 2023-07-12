<template>
  <div>
    <client-only>
      <vue-advanced-chat
        :theme="theme"
        :current-user-id="currentUser.id"
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
import { roomQuery, createRoom } from '~/graphql/Rooms'
import { messageQuery, createMessageMutation } from '~/graphql/Messages'
import { mapGetters } from 'vuex'

export default {
  name: 'Chat',
  props: {
    theme: {
      type: String,
    },
    singleRoomId: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      menuActions: [
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
      rooms: [],
      messages: [],
      messagesLoaded: true,
      showDemoOptions: true,
      responsiveBreakpoint: 600,
      singleRoom: !!this.singleRoomId || false,
      messagePage: 0,
      messagePageSize: 20,
      roomPage: 0,
      roomPageSize: 999, //TODO pagination is a problem with single rooms - cant use
      lastRoom: null
    }
  },
  mounted() {
    if (this.singleRoom) {
      this.$apollo
        .mutate({
          mutation: createRoom(),
          variables: {
            userId: this.singleRoomId,
          },
        })
        .then(() => {
          this.$apollo.queries.Rooms.refetch()
        })
        .catch((error) => {
          this.$toast.error(error)
        })
        .finally(() => {
          // this.loading = false
        })
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
  },
  methods: {
    fetchMessages({ room, options = {} }) {
      if(this.lastRoom != room.id) {
        this.messages = []
        this.messagePage = 0,
        this.lastRoom = room.id
      }
      this.messagesLoaded = false
      const offset = (options.refetch ? 0 : this.messagePage) *  this.messagePageSize
      setTimeout(async () => {
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
          
          const msgs = []
          ;[...this.messages, ...Message].forEach((m) => {
            msgs[m.indexId] = m
          })
          this.messages = msgs.filter( Boolean )


          if(Message.length < this.messagePageSize){
            this.messagesLoaded = true
          }
          this.messagePage += 1
        } catch (error) {
          this.messages = []
          this.$toast.error(error.message)
        }
      })
    },

    refetchMessage(roomId) {
      this.fetchMessages({ room: this.rooms.find((r) => r.roomId === roomId), options: { refetch: true} })
    },

    async sendMessage(message) {
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
      this.refetchMessage(message.roomId)
    },
  },
  apollo: {
    Rooms: {
      query() {
        return roomQuery()
      },
      variables() {
        return {
          first: this.roomPageSize,
          offset: this.roomPage* this.roomPageSize,
        }
      },
      update({ Room }) {
        if (!Room) {
          this.rooms = []
          return
        }

        // Backend result needs mapping of the following values
        // room[i].users[j].name -> room[i].users[j].username
        // room[i].users[j].avatar.url -> room[i].users[j].avatar
        // also filter rooms for the single room
        this.rooms = Room.map((r) => {
          return {
            ...r,
            users: r.users.map((u) => {
              return { ...u, username: u.name, avatar: u.avatar?.url }
            }),
          }
        }).filter((r) =>
          this.singleRoom ? r.users.filter((u) => u.id === this.singleRoomId).length > 0 : true,
        )
      },
      error(error) {
        this.rooms = []
        this.$toast.error(error.message)
      },
      fetchPolicy: 'no-cache',
    },
  },
}
</script>
<style lang="scss">
body {
  font-family: 'Quicksand', sans-serif;
}
</style>
