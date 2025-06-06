<template>
  <base-card>
    <ds-flex class="notifications-page-flex">
      <ds-flex-item :width="{ lg: '85%' }">
        <ds-heading tag="h3">{{ $t('notifications.title') }}</ds-heading>
      </ds-flex-item>
      <ds-flex-item width="110px">
        <client-only>
          <dropdown-filter @filter="filter" :filterOptions="filterOptions" :selected="selected" />
        </client-only>
      </ds-flex-item>
    </ds-flex>
    <ds-space />
    <ds-flex-item class="notifications-header-button" :width="{ base: 'auto' }" centered>
      <base-button
        primary
        :disabled="unreadNotificationsCount === 0"
        @click="markAllAsRead"
        data-test="markAllAsRead-button"
      >
        {{ $t('notifications.markAllAsRead') }}
      </base-button>
    </ds-flex-item>
    <ds-space />
    <notifications-table
      @markNotificationAsRead="markNotificationAsRead"
      :notifications="notifications"
    />

    <ds-flex class="notifications-footer">
      <ds-flex-item :width="{ base: 'auto' }" centered>
        <pagination-buttons
          :hasNext="hasNext"
          :hasPrevious="hasPrevious"
          @back="back"
          @next="next"
        />
      </ds-flex-item>
    </ds-flex>
  </base-card>
</template>

<script>
import NotificationsTable from '~/components/NotificationsTable/NotificationsTable'
import DropdownFilter from '~/components/DropdownFilter/DropdownFilter'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'
import { notificationQuery, markAsReadMutation, markAllAsReadMutation } from '~/graphql/User'

export default {
  components: {
    DropdownFilter,
    NotificationsTable,
    PaginationButtons,
  },
  data() {
    const pageSize = 12
    return {
      offset: 0,
      notifications: [],
      nofiticationRead: null,
      pageSize,
      first: pageSize,
      hasNext: false,
      selected: this.$t('notifications.filterLabel.all'),
    }
  },
  computed: {
    hasPrevious() {
      return this.offset > 0
    },
    filterOptions() {
      return [
        { label: this.$t('notifications.filterLabel.all'), value: null },
        { label: this.$t('notifications.filterLabel.read'), value: true },
        { label: this.$t('notifications.filterLabel.unread'), value: false },
      ]
    },
    hasNotifications() {
      return this.notifications.length
    },
    unreadNotificationsCount() {
      const result = this.notifications.reduce((count, notification) => {
        return notification.read ? count : count + 1
      }, 0)
      return result
    },
  },
  methods: {
    filter(option) {
      this.notificationRead = option.value
      this.selected = option.label
      this.$apollo.queries.notifications.refresh()
    },
    async markNotificationAsRead(notificationSourceId) {
      try {
        await this.$apollo.mutate({
          mutation: markAsReadMutation(this.$i18n),
          variables: { id: notificationSourceId },
        })
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
    back() {
      this.offset = Math.max(this.offset - this.pageSize, 0)
    },
    next() {
      this.offset += this.pageSize
    },
    async markAllAsRead() {
      if (!this.hasNotifications) {
        return
      }

      try {
        await this.$apollo.mutate({
          mutation: markAllAsReadMutation(this.$i18n),
        })
        this.$apollo.queries.notifications.refresh()
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
  apollo: {
    notifications: {
      query() {
        return notificationQuery(this.$i18n)
      },
      variables() {
        const { first, offset } = this
        return {
          read: this.notificationRead,
          orderBy: 'updatedAt_desc',
          first,
          offset,
        }
      },
      update({ notifications }) {
        if (!notifications) return []
        this.hasNext = notifications.length >= this.pageSize
        if (notifications.length <= 0 && this.offset > 0) return this.notifications // edge case, avoid a blank page
        return notifications.map((notification, index) =>
          Object.assign({}, notification, { index: this.offset + index }),
        )
      },
      fetchPolicy: 'cache-and-network',
      error(error) {
        this.$toast.error(error.message)
      },
    },
  },
}
</script>
<style lang="scss">
.notifications-page-flex {
  padding: 8px;
  justify-content: space-between;
}

.notifications-header-button {
  text-align: right;
}
.notifications-footer {
  margin-top: 1.5rem;
  justify-content: space-evenly;
}
</style>
