<template>
  <report-list />
</template>

<script>
import ReportList from '~/components/features/ReportList/ReportList'

// The moderation reports list, surfaced in the admin area too. Gated in the admin
// sidebar on content.moderate (the same permission the reports query needs); the
// areaNavigation redirect keeps an admin without it off this page. Reuses the same
// ReportList component as /moderation.
export default {
  components: {
    ReportList,
  },
}
</script>
