<!-- test maintenance in webapp logged in with "http://localhost:3000/__testing-in-webapp__/maintenance" -->
<template>
  <maintenance />
</template>

<script>
import Maintenance from '~/components/_new/features/Maintenance/Maintenance'

export default {
  layout: 'blank',
  components: {
    Maintenance,
  },
}
</script>

<style lang="scss"></style>
