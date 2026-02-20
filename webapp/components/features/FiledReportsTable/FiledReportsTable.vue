<template>
  <div v-if="filed && filed.length" class="nested-table ds-table-wrap">
    <table class="ds-table ds-table-condensed ds-table-bordered">
      <colgroup>
        <col width="15%" />
        <col width="20%" />
        <col width="30%" />
        <col width="35%" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" class="ds-table-head-col">{{ $t('moderation.reports.submitter') }}</th>
          <th scope="col" class="ds-table-head-col">{{ $t('moderation.reports.reportedOn') }}</th>
          <th scope="col" class="ds-table-head-col">{{ $t('moderation.reports.reasonCategory') }}</th>
          <th scope="col" class="ds-table-head-col">{{ $t('moderation.reports.reasonDescription') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="report in filed" :key="report.id">
          <td class="ds-table-col">
            <user-teaser
              :user="report.submitter"
              :showAvatar="false"
              :showPopover="false"
              data-test="filing-user"
            />
          </td>
          <td class="ds-table-col">
            <p class="ds-text ds-text-size-small">
              <date-time :date-time="report.createdAt" data-test="filed-date" />
            </p>
          </td>
          <td class="ds-table-col">
            {{ report.reasonCategory ? $t('report.reason.category.options.' + report.reasonCategory) : '—' }}
          </td>
          <td class="ds-table-col">
            {{ report.reasonDescription || '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<script>
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import DateTime from '~/components/DateTime'

export default {
  components: {
    UserTeaser,
    DateTime,
  },
  props: {
    filed: { type: Array, default: () => [] },
  },
}
</script>

<style lang="scss">
.nested-table {
  padding: $space-small;
  border-top: $border-size-base solid $color-neutral-60;
  border-bottom: $border-size-base solid $color-neutral-60;
}
</style>
