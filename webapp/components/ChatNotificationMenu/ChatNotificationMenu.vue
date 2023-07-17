<template>
  <nuxt-link class="chat-notification-menu" :to="{ name: 'chat' }">
    <base-button
      ghost
      circle
      v-tooltip="{
        content: $t('header.chat.tooltip'),
        placement: 'bottom-start',
      }"
    >
      <counter-icon icon="chat-bubble" :count="count" danger />
    </base-button>
  </nuxt-link>
</template>

<script>
import { mapGetters } from 'vuex'
import CounterIcon from '~/components/_new/generic/CounterIcon/CounterIcon'
import { unreadRoomsQuery, roomCountUpdated } from '~/graphql/Rooms'

export default {
  name: 'ChatNotificationMenu',
  components: {
    CounterIcon,
  },
  data() {
    return {
      count: 0,
    }
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
  },
  apollo: {
    UnreadRooms: {
      query() {
        return unreadRoomsQuery()
      },
      update({ UnreadRooms }) {
        this.count = UnreadRooms
      },
      subscribeToMore: {
        document: roomCountUpdated(),
        variables() {
          return {
            userId: this.user.id,
          }
        },
        updateQuery: (previousResult, { subscriptionData }) => {
          return { UnreadRooms: subscriptionData.data.roomCountUpdated }
        },
      },
    },
  },
}
</script>
