<template>
  <os-button
    as="nuxt-link"
    :to="{ name: 'chat' }"
    class="chat-notification-menu"
    variant="primary"
    appearance="ghost"
    circle
    :aria-label="$t('header.chats.tooltip')"
    v-tooltip="{
      content: $t('header.chats.tooltip'),
      placement: 'bottom-start',
    }"
  >
    <template #icon>
      <counter-icon icon="chat-bubble" :count="unreadRoomCount" danger />
    </template>
  </os-button>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import CounterIcon from '~/components/_new/generic/CounterIcon/CounterIcon'
import { unreadRoomsQuery, roomCountUpdated } from '~/graphql/Rooms'

export default {
  name: 'ChatNotificationMenu',
  components: {
    OsButton,
    CounterIcon,
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
      unreadRoomCount: 'chat/unreadRoomCount',
    }),
  },
  methods: {
    ...mapMutations({
      commitUnreadRoomCount: 'chat/UPDATE_ROOM_COUNT',
    }),
  },
  apollo: {
    UnreadRooms: {
      query() {
        return unreadRoomsQuery()
      },
      update({ UnreadRooms }) {
        this.commitUnreadRoomCount(UnreadRooms)
      },
      subscribeToMore: {
        document: roomCountUpdated(),
        updateQuery: (previousResult, { subscriptionData }) => {
          return { UnreadRooms: subscriptionData.data.roomCountUpdated }
        },
      },
    },
  },
}
</script>
