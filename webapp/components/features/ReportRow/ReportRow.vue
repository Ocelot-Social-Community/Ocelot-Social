<template>
  <tbody class="report-row">
    <tr>
      <!-- Icon Column -->
      <td class="ds-table-col">
        <base-icon :name="iconName" :title="iconLabel" />
      </td>

      <!-- Number of Filed Reports Column -->
      <td class="ds-table-col">
        <span class="user-count">
          {{ $t('moderation.reports.numberOfUsers', { count: report.filed.length }) }}
        </span>
        <base-button size="small" @click="showFiledReports = !showFiledReports">
          {{ $t('moderation.reports.moreDetails') }}
        </base-button>
      </td>

      <!-- Content Column -->
      <td class="ds-table-col" data-test="report-content">
        <client-only v-if="isUser">
          <user-teaser :user="report.resource" :showAvatar="false" :showPopover="false" />
        </client-only>
        <nuxt-link v-else class="title" :to="linkTarget">
          {{ linkText | truncate(50) }}
        </nuxt-link>
      </td>

      <!-- Author Column -->
      <td class="ds-table-col" data-test="report-author">
        <client-only v-if="!isUser">
          <user-teaser :user="report.resource.author" :showAvatar="false" :showPopover="false" />
        </client-only>
        <span v-else>—</span>
      </td>

      <!-- Status Column -->
      <td class="ds-table-col" data-test="report-reviewer">
        <span class="status-line">
          <base-icon :name="statusIconName" :class="isDisabled ? '--disabled' : '--enabled'" />
          {{ statusText }}
        </span>
        <client-only v-if="isReviewed">
          <user-teaser
            :user="moderatorOfLatestReview"
            :showAvatar="false"
            :date-time="report.updatedAt"
            :showPopover="false"
          />
        </client-only>
      </td>

      <!-- Decision Column -->
      <td class="ds-table-col">
        <span v-if="report.closed" class="title">
          {{ $t('moderation.reports.decided') }}
        </span>
        <base-button
          v-else
          danger
          filled
          data-test="confirm"
          size="small"
          :icon="statusIconName"
          @click="$emit('confirm-report')"
        >
          {{ $t('moderation.reports.decideButton') }}
        </base-button>
      </td>
    </tr>

    <tr class="row">
      <td colspan="100%">
        <filed-reports-table :filed="report.filed" v-if="showFiledReports" />
      </td>
    </tr>
  </tbody>
</template>

<script>
import FiledReportsTable from '~/components/features/FiledReportsTable/FiledReportsTable'
import UserTeaser from '~/components/UserTeaser/UserTeaser'

export default {
  components: {
    FiledReportsTable,
    UserTeaser,
  },
  props: {
    report: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      showFiledReports: false,
    }
  },
  computed: {
    isPost() {
      return this.report.resource.__typename === 'Post'
    },
    isComment() {
      return this.report.resource.__typename === 'Comment'
    },
    isUser() {
      return this.report.resource.__typename === 'User'
    },
    isDisabled() {
      return this.report.resource.disabled
    },
    isReviewed() {
      const { reviewed } = this.report
      return reviewed && reviewed.length
    },
    iconName() {
      let name
      switch (this.report.resource.__typename) {
        case 'User':
          name = 'user'
          break
        case 'Group':
          name = 'users'
          break
        case 'Post':
          name = 'bookmark'
          break
        case 'Comment':
          name = 'comments'
          break

        default:
          name = null
          break
      }
      return name
    },
    iconLabel() {
      let label
      switch (this.report.resource.__typename) {
        case 'User':
          label = this.$t('report.user.type')
          break
        case 'Group':
          label = this.$t('report.group.type')
          break
        case 'Post':
          label = this.$t('report.contribution.type')
          break
        case 'Comment':
          label = this.$t('report.comment.type')
          break

        default:
          label = null
          break
      }
      return label
    },
    linkTarget() {
      const { id, slug } = this.isComment ? this.report.resource.post : this.report.resource
      return {
        name: 'post-id-slug',
        params: { id, slug },
        hash: this.isComment ? `#commentId-${this.report.resource.id}` : '',
      }
    },
    linkText() {
      let text
      switch (this.report.resource.__typename) {
        case 'User':
          text = '' // user avatar is used
          break
        case 'Group':
          text = this.report.resource.name
          break
        case 'Post':
          text = this.report.resource.title
          break
        case 'Comment':
          text = this.$filters.removeHtml(this.report.resource.contentExcerpt)
          break

        default:
          text = null
          break
      }
      return text
    },
    statusIconName() {
      return this.isDisabled ? 'eye-slash' : 'eye'
    },
    statusText() {
      if (!this.isReviewed) return this.$t('moderation.reports.enabled')
      else if (this.isDisabled) return this.$t('moderation.reports.disabledBy')
      else return this.$t('moderation.reports.enabledBy')
    },
    moderatorOfLatestReview() {
      const [latestReview] = this.report.reviewed
      return latestReview && latestReview.moderator
    },
  },
}
</script>

<style lang="scss">
.report-row {
  &:nth-child(2n + 1) {
    background-color: $color-neutral-95;
  }

  .title {
    font-weight: $font-weight-bold;
  }

  .status-line {
    display: inline-flex;

    > .base-icon {
      margin-right: $space-xx-small;
    }
  }

  .user-count {
    display: block;
    margin-bottom: $space-xx-small;
  }

  .--disabled {
    color: $color-danger;
  }

  .--enabled {
    color: $color-success;
  }
}
</style>
