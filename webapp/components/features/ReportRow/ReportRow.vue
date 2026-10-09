<template>
  <tbody class="report-row">
    <tr>
      <!-- Icon Column -->
      <td class="ds-table-col">
        <os-icon :icon="iconName" :aria-label="iconLabel" />
      </td>

      <!-- Number of Filed Reports Column -->
      <td class="ds-table-col">
        <span class="user-count">
          {{ $t('moderation.reports.numberOfUsers', { count: report.filed.length }) }}
        </span>
        <os-button
          variant="primary"
          appearance="outline"
          size="sm"
          @click="showFiledReports = !showFiledReports"
        >
          {{ $t('moderation.reports.moreDetails') }}
          <template #suffix>
            <os-icon :icon="showFiledReports ? icons.angleUp : icons.angleDown" />
          </template>
        </os-button>
      </td>

      <!-- Content Column -->
      <td class="ds-table-col" data-test="report-content">
        <client-only v-if="isUser">
          <user-avatar :user="report.resource" :showAvatar="false" :showPopover="false" />
        </client-only>
        <!-- Content in a group this moderator may not read: the report stays here to be
             escalated, but neither its text nor a link to it is shown. The server blanked the
             content already — this is what says why instead of rendering an empty link. -->
        <span v-else-if="isHidden" class="hidden-content" data-test="report-hidden">
          {{ $t('moderation.reports.hiddenContent') }}
        </span>
        <nuxt-link v-else class="title" :to="linkTarget">
          {{ $filters.truncate(linkText, 50) }}
        </nuxt-link>
      </td>

      <!-- Author Column -->
      <td class="ds-table-col" data-test="report-author">
        <client-only v-if="!isUser">
          <user-avatar :user="report.resource.author" :showAvatar="false" :showPopover="false" />
        </client-only>
        <span v-else>—</span>
      </td>

      <!-- Status Column -->
      <td class="ds-table-col" data-test="report-reviewer">
        <span class="status-line">
          <os-icon :icon="statusIconName" :class="isDisabled ? '--disabled' : '--enabled'" />
          {{ statusText }}
        </span>
        <client-only v-if="isReviewed">
          <user-avatar
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
        <!-- The shield refuses `review` on exactly this condition, so offering the button
             would only produce an error. The report can still be escalated by somebody who
             may read the group. -->
        <span v-else-if="isHidden" class="hidden-content" data-test="report-undecidable">
          {{ $t('moderation.reports.hiddenDecision') }}
        </span>
        <os-button
          v-else
          variant="danger"
          appearance="filled"
          data-test="confirm"
          size="sm"
          @click="$emit('confirm-report')"
        >
          <template #icon>
            <os-icon :icon="statusIconName" />
          </template>
          {{ $t('moderation.reports.decideButton') }}
        </os-button>
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
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import FiledReportsTable from '~/components/features/FiledReportsTable/FiledReportsTable'
import UserAvatar from '~/components/UserAvatar/UserAvatar'

export default {
  components: {
    OsButton,
    OsIcon,
    FiledReportsTable,
    UserAvatar,
  },
  emits: ['confirm-report'],
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
  created() {
    this.icons = iconRegistry
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
    // The server's answer, not a guess: `resourceHidden` is true when the reported content
    // lives in a group this moderator holds no reading right in.
    isHidden() {
      return this.report.resourceHidden === true
    },
    isDisabled() {
      return this.report.resource.disabled
    },
    isReviewed() {
      const { reviewed } = this.report
      return reviewed && reviewed.length
    },
    iconName() {
      if (this.isPost) return this.icons.bookmark
      else if (this.isComment) return this.icons.comments
      else if (this.isUser) return this.icons.user
      else return null
    },
    iconLabel() {
      if (this.isPost) return this.$t('report.contribution.type')
      else if (this.isComment) return this.$t('report.comment.type')
      else if (this.isUser) return this.$t('report.user.type')
      else return null
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
      return this.report.resource.title || this.$filters.removeHtml(this.report.resource.content)
    },
    statusIconName() {
      return this.isDisabled ? this.icons.eyeSlash : this.icons.eye
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

<style>
.report-row {
  &:nth-child(2n + 1) {
    background-color: var(--color-neutral-95);
  }

  .title {
    font-weight: var(--text-weight-bold);
  }

  .status-line {
    display: inline-flex;

    > .os-icon {
      margin-right: var(--space-xx-small);
    }
  }

  .user-count {
    display: block;
    margin-bottom: var(--space-xx-small);
  }

  .hidden-content {
    color: var(--text-color-soft);
    font-style: italic;
  }

  .--disabled {
    color: var(--color-danger);
  }

  .--enabled {
    color: var(--color-success);
  }
}
</style>
