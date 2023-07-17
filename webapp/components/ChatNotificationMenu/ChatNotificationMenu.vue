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
import { unreadRoomsQuery } from '~/graphql/Rooms'
import { chatMessageAdded } from '~/graphql/Messages'

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
        document: chatMessageAdded(),
        variables() {
          return {
            userId: this.user.id,
          }
        },
        updateQuery: (previousResult, { subscriptionData }) => {
          // TODO emit chat reload
          return { UnreadRooms: previousResult.UnreadRooms + 1}
        },
      },
    },
  },
}
</script>
