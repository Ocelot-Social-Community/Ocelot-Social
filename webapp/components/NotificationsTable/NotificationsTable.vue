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
              <ds-flex-item :width="{ base: '20%' }">
                <div>
                  <base-card :wide-content="true">
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
                  </base-card>
                </div>
              </ds-flex-item>
              <ds-flex-item>
                <div>
                  <base-card :wide-content="true">
                    <ds-space margin-bottom="base">
                      <client-only>
                        <user-teaser
                          :user="
                            isGroup(notification.from)
                              ? notification.relatedUser
                              : notification.from.author
                          "
                          :date-time="notification.from.createdAt"
                          :class="{ 'notification-status': notification.read }"
                        />
                      </client-only>
                    </ds-space>
                    <ds-text :class="{ 'notification-status': notification.read, reason: true }">
                      {{ $t(`notifications.reason.${notification.reason}`) }}
                    </ds-text>
                  </base-card>
                </div>
              </ds-flex-item>
            </ds-flex>
          </ds-grid-item>
          <ds-grid-item>
            <ds-flex class="content-section" :direction="{ base: 'column', xs: 'row' }">
              <ds-flex-item>
                <base-card :wide-content="true">
                  <nuxt-link
                    class="notification-mention-post"
                    :class="{ 'notification-status': notification.read }"
                    :to="{
                      name: isGroup(notification.from) ? 'group-id-slug' : 'post-id-slug',
                      params: params(notification.from),
                      hash: hashParam(notification.from),
                    }"
                    @click.native="markNotificationAsRead(notification.from.id)"
                  >
                    <b>
                      {{
                        notification.from.title ||
                        notification.from.groupName ||
                        notification.from.post.title | truncate(50)
                      }}
                    </b>
                  </nuxt-link>
                </base-card>
              </ds-flex-item>
              <ds-flex-item>
                <base-card :wide-content="true">
                  <b :class="{ 'notification-status': notification.read }">
                    {{
                      notification.from.contentExcerpt ||
                      notification.from.descriptionExcerpt | removeHtml
                    }}
                  </b>
                </base-card>
              </ds-flex-item>
            </ds-flex>
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
  },
  computed: {
    fields() {
      return {
        icon: {
          label: ' ',
          width: '5',
        },
        user: {
          label: this.$t('notifications.user'),
          width: '45%',
        },
        post: {
          label: this.$t('notifications.post'),
          width: '25%',
        },
        content: {
          label: this.$t('notifications.content'),
          width: '25%',
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
      this.$emit('markNotificationAsRead', notificationSourceId)
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
.notification-grid .ds-grid.header-grid {
  grid-template-columns: 1fr 4fr 3fr 3fr !important;
}
.notification-grid-row {
  border-top: 1px dotted #e5e3e8;
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
@media screen and (max-width: 768px) {
  .notification-grid .ds-grid {
    grid-template-columns: 1fr !important;
  }
  .notification-grid .content-section {
    border-top: 1px dotted #e5e3e8;
  }
  .notification-grid-row {
    box-shadow: 0px 12px 26px -4px rgb(0 0 0 / 10%);
    margin-top: 5px;
    border-top: none;
  }
}
</style>
