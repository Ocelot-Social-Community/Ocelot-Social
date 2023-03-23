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
        content: $t('notifications.headerMenuButton.tooltip'),
        placement: 'bottom-start',
      }"
    />
  </nuxt-link>
  <dropdown v-else class="notifications-menu" offset="8" :placement="placement">
    <template #default="{ toggleMenu }">
      <base-button
        ghost
        circle
        v-tooltip="{
          content: $t('notifications.headerMenuButton.tooltip'),
          placement: 'bottom-start',
        }"
        @click="toggleMenu"
      >
        <counter-icon icon="bell" :count="unreadNotificationsCount" danger />
      </base-button>
    </template>
    <template #popover="{ closeMenu }">
      <div class="notifications-menu-popover">
        <notification-list :notifications="notifications" @markAsRead="markAsRead" />
      </div>
      <ds-flex class="notifications-link-container">
        <ds-flex-item class="notifications-link-container-item" :width="{ base: '100%' }" centered>
          <nuxt-link :to="{ name: 'notifications' }">
            <base-button ghost primary>
              {{ $t('notifications.pageLink') }}
            </base-button>
          </nuxt-link>
        </ds-flex-item>
        <ds-flex-item class="notifications-link-container-item" :width="{ base: '100%' }" centered>
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
import NotificationList from '../NotificationList/NotificationList'

export default {
  name: 'NotificationMenu',
  components: {
    CounterIcon,
    Dropdown,
    NotificationList,
  },
  data() {
    return {
      notifications: [],
    }
  },
  props: {
    placement: { type: String },
  },
  methods: {
    async markAsRead(notificationSourceId) {
      const variables = { id: notificationSourceId }
      try {
        await this.$apollo.mutate({
          mutation: markAsReadMutation(this.$i18n),
          variables,
        })
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    async markAllAsRead(closeMenu) {
      if (!this.hasNotifications) {
        return
      }

      closeMenu()
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
        return notificationQuery(this.$i18n)
      },
      variables() {
        return {
          read: false,
          orderBy: 'updatedAt_desc',
        }
      },
      subscribeToMore: {
        document: notificationAdded(),
        variables() {
          return {
            userId: this.user.id,
          }
        },
        updateQuery: (previousResult, { subscriptionData }) => {
          const {
            data: { notificationAdded: newNotification },
          } = subscriptionData
          return {
            notifications: unionBy(
              [newNotification],
              previousResult.notifications,
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
  justify-content: center;
  padding: $space-x-small;
  flex-direction: row;
}
.notifications-link-container-item {
  justify-content: center;
  display: flex;
}
</style>
