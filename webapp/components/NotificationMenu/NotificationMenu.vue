<template>
  <nuxt-link
    v-if="!unreadNotificationsCount"
    class="notifications-menu"
    :to="{ name: 'notifications' }"
  >
    <base-button
      icon="bell"
      ghost
      circle
      v-tooltip="{
        content: $t('header.notifications.tooltip'),
        placement: 'bottom-start',
      }"
    />
  </nuxt-link>
  <nuxt-link v-else-if="noMenu" class="notifications-menu" :to="{ name: 'notifications' }">
    <base-button
      ghost
      circle
      v-tooltip="{
        content: $t('header.notifications.tooltip'),
        placement: 'bottom-start',
      }"
    >
      <counter-icon icon="bell" :count="unreadNotificationsCount" danger />
    </base-button>
  </nuxt-link>
  <dropdown
    v-else
    class="notifications-menu"
    offset="8"
    :placement="placement"
    noMouseLeaveClosing
    ref="dropdown"
  >
    <template #default="{ toggleMenu }">
      <base-button
        ghost
        circle
        v-tooltip="{
          content: $t('header.notifications.tooltip'),
          placement: 'bottom-start',
        }"
        @click="toggleMenu"
      >
        <counter-icon icon="bell" :count="unreadNotificationsCount" danger />
      </base-button>
    </template>
    <template #popover="{ closeMenu }">
      <ds-flex class="notifications-link-container">
        <ds-flex-item>
          <nuxt-link :to="{ name: 'notifications' }">
            <base-button ghost primary>
              {{ $t('notifications.pageLink') }}
            </base-button>
          </nuxt-link>
          <base-button
            ghost
            primary
            @click="markAllAsRead(closeMenu)"
            data-test="markAllAsRead-button"
          >
            {{ $t('notifications.markAllAsRead') }}
          </base-button>
        </ds-flex-item>
      </ds-flex>
      <div class="notifications-menu-popover">
        <notifications-table
          @markNotificationAsRead="markAsReadAndCloseMenu($event, closeMenu)"
          :notifications="notifications"
          :show-popover="false"
        />
      </div>
    </template>
  </dropdown>
</template>

<script>
import { mapGetters } from 'vuex'
import unionBy from 'lodash/unionBy'
import {
  notificationQuery,
  markAsReadMutation,
  notificationAdded,
  markAllAsReadMutation,
} from '~/graphql/User'
import CounterIcon from '~/components/_new/generic/CounterIcon/CounterIcon'
import Dropdown from '~/components/Dropdown'
import NotificationsTable from '../NotificationsTable/NotificationsTable.vue'

export default {
  name: 'NotificationMenu',
  components: {
    NotificationsTable,
    CounterIcon,
    Dropdown,
  },
  data() {
    return {
      notifications: [],
    }
  },
  props: {
    placement: { type: String },
    noMenu: { type: Boolean, default: false },
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    handleResize() {
      // When the viewport get resized close menu
      this.$refs?.dropdown?.closeMenu?.()
    },
    async markAsReadAndCloseMenu(notificationSourceId, closeMenu) {
      try {
        await this.$apollo.mutate({
          mutation: markAsReadMutation(this.$i18n),
          variables: { id: notificationSourceId },
        })

        closeMenu?.()
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    async markAllAsRead(closeMenu) {
      if (!this.hasNotifications) {
        return
      }

      closeMenu?.()
      try {
        await this.$apollo.mutate({
          mutation: markAllAsReadMutation(this.$i18n),
        })
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    unreadNotificationsCount() {
      const result = this.notifications.reduce((count, notification) => {
        return notification.read ? count : count + 1
      }, 0)
      return result
    },
    hasNotifications() {
      return this.notifications.length
    },
  },
  apollo: {
    notifications: {
      query() {
        return notificationQuery()
      },
      variables() {
        return {
          read: false,
          orderBy: 'updatedAt_desc',
        }
      },
      subscribeToMore: {
        document: notificationAdded(),
        updateQuery: (previousResult, { subscriptionData }) => {
          const {
            data: { notificationAdded: newNotification },
          } = subscriptionData

          return {
            notifications: unionBy(
              [newNotification],
              previousResult?.notifications,
              (notification) => notification.id,
            ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
          }
        },
      },
      error(error) {
        this.$toast.error(error.message)
      },
    },
  },
}
</script>

<style lang="scss">
.notifications-menu-popover {
  max-width: 500px;
}
.notifications-link-container {
  background-color: $background-color-softer-active;
  text-align: right;
  padding: $space-x-small 0;
  flex-direction: row;
}
</style>
