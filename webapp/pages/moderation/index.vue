<template>
  <report-list />
</template>

<script>
import ReportList from '~/components/features/ReportList/ReportList'

export default {
  // No per-page 403: the area is group-gated (canAccessModeration) and the reports
  // query is content.moderate-gated server-side, so a badge-only viewer landing here
  // sees an empty reports card (graceful degradation, mirroring the admin dashboard).
  // The Reports sidebar entry is hidden from them in moderation.vue.
  components: {
    ReportList,
  },
}
</script>
