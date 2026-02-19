<template>
  <os-card>
    <div class="ds-flex notifications-page-flex">
      <div class="notifications-layout__title">
        <h3 class="ds-heading ds-heading-h3">{{ $t('notifications.title') }}</h3>
      </div>
      <div style="flex: 0 0 110px; width: 110px">
        <client-only>
          <dropdown-filter @filter="filter" :filterOptions="filterOptions" :selected="selected" />
        </client-only>
      </div>
    </div>
    <div class="ds-mb-large"></div>
    <div class="notifications-header-button" style="flex: 0 0 auto; align-self: center">
      <os-button
        variant="primary"
        appearance="outline"
        :disabled="unreadNotificationsCount === 0"
        data-test="markAllAsRead-button"
        @click="markAllAsRead"
      >
        {{ $t('notifications.markAllAsRead') }}
      </os-button>
    </div>
    <div class="ds-mb-large"></div>
    <notifications-table
      @markNotificationAsRead="markNotificationAsRead"
      :notifications="notifications"
    />

    <div class="ds-flex notifications-footer">
      <div style="flex: 0 0 auto; align-self: center">
        <pagination-buttons
          :hasNext="hasNext"
          :hasPrevious="hasPrevious"
          @back="back"
          @next="next"
        />
      </div>
    </div>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
import NotificationsTable from '~/components/NotificationsTable/NotificationsTable'
import DropdownFilter from '~/components/DropdownFilter/DropdownFilter'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'
import { notificationQuery, markAsReadMutation, markAllAsReadMutation } from '~/graphql/User'

export default {
  components: {
    OsCard,
    OsButton,
    DropdownFilter,
    NotificationsTable,
    PaginationButtons,
  },
  data() {
    const pageSize = 12
    return {
      offset: 0,
      notifications: [],
      notificationRead: null,
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
@media #{$media-query-large} {
  .notifications-layout__title {
    flex: 0 0 85%;
    width: 85%;
  }
}
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
