<template>
  <div class="notification-grid" v-if="notifications && notifications.length">
    <div class="ds-grid">
      <div v-if="!isMobile" style="grid-column: 1 / -1;">
        <div class="ds-grid header-grid">
          <div v-for="field in fields" :key="field.label" class="ds-table-head-col">
            {{ field.label }}
          </div>
        </div>
      </div>
      <div
        v-for="notification in notifications"
        :key="notification.id"
        style="grid-column: 1 / -1;"
        class="notification-grid-row"
      >
        <div class="ds-grid">
          <div>
            <div class="ds-flex user-section">
              <div class="ds-flex-item">
                <user-teaser
                  :user="
                    isGroup(notification.from) ? notification.relatedUser : notification.from.author
                  "
                  :class="{ 'notification-status': notification.read }"
                  :date-time="notification.from.createdAt"
                  :injected-text="$t(`notifications.reason.${notification.reason}`)"
                  :injected-date="true"
                  :show-popover="showPopover"
                />
              </div>
            </div>
          </div>
          <div>
            <div class="notification-container">
              <!-- Icon with responsive sizing -->
              <div class="notification-icon">
                <os-icon
                  v-if="notification.from.post"
                  :icon="icons.comment"
                  v-tooltip="{ content: $t('notifications.comment'), placement: 'right' }"
                />
                <os-icon
                  v-else
                  :icon="icons.bookmark"
                  v-tooltip="{ content: $t('notifications.post'), placement: 'right' }"
                />
              </div>

              <!-- Content section with title and description -->
              <div class="notification-content">
                <nuxt-link
                  class="notification-mention-post"
                  :class="{ 'notification-status': notification.read }"
                  :to="{
                    name: isGroup(notification.from) ? 'groups-id-slug' : 'post-id-slug',
                    params: params(notification.from),
                    hash: hashParam(notification.from),
                  }"
                  @click.native.prevent="handleNotificationClick(notification)"
                >
                  <b>
                    {{
                      notification.from.title ||
                      notification.from.groupName ||
                      (notification.from.post && notification.from.post.title) | truncate(50)
                    }}
                  </b>
                </nuxt-link>
                <p
                  class="notification-description"
                  :class="{ 'notification-status': notification.read }"
                >
                  {{
                    notification.from.contentExcerpt ||
                    notification.from.descriptionExcerpt | removeHtml
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <hc-empty v-else icon="alert" :message="$t('notifications.empty')" />
</template>
<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import HcEmpty from '~/components/Empty/Empty'
import mobile from '~/mixins/mobile'

const maxMobileWidth = 768 // at this point the table breaks down

export default {
  mixins: [mobile(maxMobileWidth)],
  components: {
    OsIcon,
    UserTeaser,
    HcEmpty,
  },
  props: {
    notifications: { type: Array, default: () => [] },
    showPopover: { type: Boolean, default: true },
  },
  computed: {
    fields() {
      return {
        user: {
          label: this.$t('notifications.user'),
          width: '50%',
        },
        post: {
          label: this.$t('notifications.post'),
          width: '50%',
        },
      }
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    isComment(notificationSource) {
      return notificationSource.__typename === 'Comment'
    },
    isGroup(notificationSource) {
      return notificationSource.__typename === 'Group'
    },
    params(notificationSource) {
      const target = this.isComment(notificationSource)
        ? notificationSource.post
        : notificationSource
      return {
        id: target.id,
        slug: target.slug,
      }
    },
    hashParam(notificationSource) {
      return this.isComment(notificationSource) ? `#commentId-${notificationSource.id}` : ''
    },
    markNotificationAsRead(notificationSourceId) {
      return new Promise((resolve) => {
        this.$emit('markNotificationAsRead', notificationSourceId)
        resolve()
      })
    },
    async handleNotificationClick(notification) {
      const route = {
        name: this.isGroup(notification.from) ? 'groups-id-slug' : 'post-id-slug',
        params: this.params(notification.from),
        hash: this.hashParam(notification.from),
      }

      await this.markNotificationAsRead(notification.from.id)

      setTimeout(() => {
        this.$router.push(route)
      }, 10)
    },
  },
}
</script>
<style lang="scss">
.notification-status {
  opacity: $opacity-soft;
}
/* fix to override flex-wrap style of ds flex component */
.notification-grid .content-section {
  flex-wrap: nowrap;
}
.notification-grid .ds-grid {
  grid-template-columns: 5fr 6fr !important;
  grid-auto-rows: auto !important;
  grid-template-rows: 1fr;
  gap: 0px !important;
}
.notification-grid-row {
  padding: 10px;
  border-bottom: 1px dotted #e5e3e8;
  background-color: white;

  &:nth-child(odd) {
    background-color: $color-neutral-90;
  }

  > .ds-grid > div {
    padding: 8px 0;
  }
}
@media screen and (max-width: 768px) {
  .notification-grid .ds-grid {
    grid-template-columns: 1fr !important;
  }
  .notification-grid .content-section {
    border-top: 1px dotted #e5e3e8;
  }
}

.notification-description {
  margin-top: 4px;
}
.notification-container {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  .notification-icon {
    flex-shrink: 0;
  }
}

/* Desktop icon size */
@media (min-width: 768px) {
  .notification-icon {
    width: 18px;
  }

  .notification-icon :deep(svg) {
    width: 25px;
    height: 25px;
  }
}

/* Mobile icon size */
@media (max-width: 767px) {
  .notification-icon {
    width: 34px;
    text-align: center;
  }

  .notification-icon :deep(svg) {
    width: 50px;
    height: 50px;
  }
}

.notification-content {
  flex: 1;
}
</style>
