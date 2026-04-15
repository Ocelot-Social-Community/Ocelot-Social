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
      <os-counter-icon :icon="icons.chatBubble" :count="unreadRoomCount" danger />
    </template>
  </os-button>
</template>

<script>
import { OsCounterIcon, OsButton } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters, mapMutations } from 'vuex'
import { unreadRoomsQuery, roomUpdated, roomUnreadFragment } from '~/graphql/Rooms'

export default {
  name: 'ChatNotificationMenu',
  components: {
    OsCounterIcon,
    OsButton,
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
      unreadRoomCount: 'chat/unreadRoomCount',
    }),
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    this._subscriptions = []
    const observer = this.$apollo.subscribe({
      query: roomUpdated(),
      fetchPolicy: 'no-cache',
    })
    const sub = observer.subscribe({
      next: ({ data }) => this.applyRoomUpdate(data?.roomUpdated),
      error: (err) => {
        // eslint-disable-next-line no-console
        console.error('roomUpdated subscription error:', err)
      },
    })
    this._subscriptions.push(sub)
  },
  beforeDestroy() {
    this._subscriptions?.forEach((s) => s.unsubscribe())
  },
  methods: {
    ...mapMutations({
      commitUnreadRoomCount: 'chat/UPDATE_ROOM_COUNT',
    }),
    applyRoomUpdate(room) {
      if (!room || !room.id) return
      const client = this.$apollo.provider.defaultClient
      const cacheId = `Room:${room.id}`
      const newUnread = room.unreadCount || 0
      let prev = null
      let cacheMiss = false
      try {
        prev = client.cache.readFragment({ id: cacheId, fragment: roomUnreadFragment })
        if (!prev) cacheMiss = true
      } catch (_e) {
        cacheMiss = true
      }
      try {
        client.cache.writeFragment({
          id: cacheId,
          fragment: roomUnreadFragment,
          data: { __typename: 'Room', id: room.id, unreadCount: newUnread },
        })
      } catch (_e) {
        // entity not in cache yet — writeFragment can fail before first normalization
      }
      if (cacheMiss) {
        // Previous state unknown — guessing a delta can over- or under-count
        // (UnreadRooms query does not populate Room:<id> fragments).
        // Fall back to the authoritative server count.
        this.$apollo.queries.UnreadRooms.refetch()
        return
      }
      const prevUnread = prev.unreadCount || 0
      let delta = 0
      if (prevUnread === 0 && newUnread > 0) delta = 1
      else if (prevUnread > 0 && newUnread === 0) delta = -1
      if (delta !== 0) {
        this.commitUnreadRoomCount(Math.max(0, Number(this.unreadRoomCount) + delta))
      }
    },
  },
  apollo: {
    UnreadRooms: {
      query() {
        return unreadRoomsQuery()
      },
      update({ UnreadRooms }) {
        this.commitUnreadRoomCount(UnreadRooms)
      },
      fetchPolicy: 'network-only',
    },
  },
}
</script>
