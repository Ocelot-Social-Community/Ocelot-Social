<template>
  <os-button
    v-if="!unreadNotificationsCount || noMenu"
    as="nuxt-link"
    :to="{ name: 'notifications' }"
    class="notifications-menu"
    variant="primary"
    appearance="ghost"
    circle
    :aria-label="$t('header.notifications.tooltip')"
    v-tooltip="{
      content: $t('header.notifications.tooltip'),
      placement: 'bottom-start',
    }"
  >
    <template #icon>
      <os-counter-icon :icon="icons.bell" :count="unreadNotificationsCount" danger />
    </template>
  </os-button>
  <dropdown
    v-else
    class="notifications-menu"
    offset="8"
    :placement="placement"
    noMouseLeaveClosing
    ref="dropdown"
  >
    <template #default="{ toggleMenu }">
      <os-button
        variant="primary"
        appearance="ghost"
        circle
        :aria-label="$t('header.notifications.tooltip')"
        v-tooltip="{
          content: $t('header.notifications.tooltip'),
          placement: 'bottom-start',
        }"
        @click="toggleMenu"
      >
        <template #icon>
          <os-counter-icon :icon="icons.bell" :count="unreadNotificationsCount" danger />
        </template>
      </os-button>
    </template>
    <template #popover="{ closeMenu }">
      <div class="ds-flex notifications-link-container">
        <div class="ds-flex-item">
          <os-button
            as="nuxt-link"
            :to="{ name: 'notifications' }"
            appearance="ghost"
            variant="primary"
          >
            <template #icon>
              <os-icon :icon="icons.bell" />
            </template>
            {{ $t('notifications.pageLink') }}
          </os-button>
          <os-button
            appearance="ghost"
            variant="primary"
            @click="markAllAsRead()"
            data-test="markAllAsRead-button"
          >
            <template #icon>
              <os-icon :icon="icons.check" />
            </template>
            {{ $t('notifications.markAllAsRead') }}
          </os-button>
        </div>
      </div>
      <div class="notifications-menu-popover">
        <notifications-table
          @markNotificationAsRead="markAsReadAndCloseMenu($event, closeMenu)"
          @toggleNotificationRead="toggleNotificationRead"
          :notifications="notifications"
          :show-popover="false"
          :show-read-toggle="true"
        />
      </div>
    </template>
  </dropdown>
</template>

<script>
import { mapGetters } from 'vuex'
import unionBy from 'lodash/unionBy'
import { OsCounterIcon, OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import {
  notificationQuery,
  markAsReadMutation,
  markAsUnreadMutation,
  notificationAdded,
  markAllAsReadMutation,
} from '~/graphql/User'
import Dropdown from '~/components/Dropdown'
import NotificationsTable from '../NotificationsTable/NotificationsTable.vue'

// Grace period between a toggle click and the dropdown refetch. Gives the user
// time to undo their action before the row disappears from the filtered list.
const NOTIFICATIONS_REFETCH_DELAY_MS = 3000

export default {
  name: 'NotificationMenu',
  components: {
    NotificationsTable,
    OsCounterIcon,
    Dropdown,
    OsButton,
    OsIcon,
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
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    clearTimeout(this._notificationsRefetchTimer)
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
    async toggleNotificationRead({ resourceId, read }) {
      try {
        await this.$apollo.mutate({
          mutation: read ? markAsUnreadMutation(this.$i18n) : markAsReadMutation(this.$i18n),
          variables: { id: resourceId },
        })
        // Delay the list refetch so the user can revise their decision. The toggle
        // icon flips instantly (entity normalization), the counter also updates
        // instantly because its reducer reads the updated NOTIFIED.read field, but
        // the row stays visible in the filtered dropdown list until this refetch.
        this.scheduleNotificationsRefetch()
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    scheduleNotificationsRefetch() {
      clearTimeout(this._notificationsRefetchTimer)
      this._notificationsRefetchTimer = setTimeout(() => {
        this.$apollo.queries.notifications.refetch()
      }, NOTIFICATIONS_REFETCH_DELAY_MS)
    },
    async markAllAsRead() {
      if (!this.hasNotifications) {
        return
      }

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
  padding-top: $space-x-small;
  flex-direction: row;
}
</style>
