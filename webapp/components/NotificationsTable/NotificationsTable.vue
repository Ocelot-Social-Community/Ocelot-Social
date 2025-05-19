<template>
  <div class="notification-grid" v-if="notifications && notifications.length">
    <ds-grid>
      <ds-grid-item v-if="!isMobile" column-span="fullWidth">
        <ds-grid class="header-grid">
          <ds-grid-item v-for="field in fields" :key="field.label" class="ds-table-head-col">
            {{ field.label }}
          </ds-grid-item>
        </ds-grid>
      </ds-grid-item>
      <ds-grid-item
        v-for="notification in notifications"
        :key="notification.id"
        column-span="fullWidth"
        class="notification-grid-row"
      >
        <ds-grid>
          <ds-grid-item>
            <ds-flex class="user-section">
              <ds-flex-item>
                <base-card :wide-content="true">
                  <client-only>
                    <user-teaser
                      :user="
                        isGroup(notification.from)
                          ? notification.relatedUser
                          : notification.from.author
                      "
                      :class="{ 'notification-status': notification.read }"
                      :date-time="notification.from.createdAt"
                      :injected-text="$t(`notifications.reason.${notification.reason}`)"
                      :injected-date="true"
                      :show-popover="showPopover"
                    />
                  </client-only>
                </base-card>
              </ds-flex-item>
            </ds-flex>
          </ds-grid-item>
          <ds-grid-item>
            <base-card :wide-content="true">
            <div class="notification-container">
              <!-- Icon with responsive sizing -->
              <div class="notification-icon">
                <base-icon
                  v-if="notification.from.post"
                  name="comment"
                  v-tooltip="{ content: $t('notifications.comment'), placement: 'right' }"
                />
                <base-icon
                  v-else
                  name="bookmark"
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
                      notification.from.post.title | truncate(50)
                    }}
                  </b>
                </nuxt-link>
                <p class="notification-description" :class="{ 'notification-status': notification.read }">
                  {{
                    notification.from.contentExcerpt ||
                    notification.from.descriptionExcerpt | removeHtml
                  }}
                </p>
              </div>
            </div>
            </base-card>
          </ds-grid-item>
        </ds-grid>
      </ds-grid-item>
    </ds-grid>
  </div>
  <hc-empty v-else icon="alert" :message="$t('notifications.empty')" />
</template>
<script>
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import HcEmpty from '~/components/Empty/Empty'
import BaseCard from '../_new/generic/BaseCard/BaseCard.vue'
import mobile from '~/mixins/mobile'

const maxMobileWidth = 768 // at this point the table breaks down

export default {
  components: {
    UserTeaser,
    HcEmpty,
    BaseCard,
  },
  mixins: [mobile(maxMobileWidth)],
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
        this.$emit('markNotificationAsRead', notificationSourceId);
        resolve();
      });
    },
    async handleNotificationClick(notification) {
      const route = {
        name: this.isGroup(notification.from) ? 'groups-id-slug' : 'post-id-slug',
        params: this.params(notification.from),
        hash: this.hashParam(notification.from),
      };

      await this.markNotificationAsRead(notification.from.id);

      setTimeout(() => {
        this.$router.push(route);
      }, 10);
    }
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
.notification-grid .base-card {
  border-radius: 0;
  box-shadow: none;
  padding: 16px 4px;
}
/* dirty fix to override broken styleguide inline-styles */
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
  .base-card {
    padding: 8px 0;
    background-color: unset !important;
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
