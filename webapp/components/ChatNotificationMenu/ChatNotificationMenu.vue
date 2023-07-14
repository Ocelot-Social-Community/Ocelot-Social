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
import CounterIcon from '~/components/_new/generic/CounterIcon/CounterIcon'
import { unreadRoomsQuery } from '~/graphql/Rooms'

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
  apollo: {
    UnreadRooms: {
      query() {
        return unreadRoomsQuery()
      },
      update({ UnreadRooms }) {
        this.count = UnreadRooms
      },
    },
  },
}
</script>
