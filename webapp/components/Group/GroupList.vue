<template>
  <div class="ds-flex group-list">
    <div v-for="group in groups" :key="group.id" class="group-list__item group-item">
      <group-teaser :group="group" />
    </div>
  </div>
</template>

<script>
import GroupTeaser from '~/components/Group/GroupTeaser'

export default {
  name: 'GroupList',
  components: {
    GroupTeaser,
  },
  props: {
    groups: { type: Array, default: () => [] },
  },
}
</script>
<style lang="scss" scoped>
.group-list__item {
  flex: 0 0 98%;
  width: 98%;
}
@media #{$media-query-medium} {
  .group-list__item {
    flex: 0 0 48%;
    width: 48%;
  }
}
.group-item {
  margin: 0 1% 2% 1%;
}
</style>
