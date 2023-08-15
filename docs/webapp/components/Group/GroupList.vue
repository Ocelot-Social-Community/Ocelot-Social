<template>
  <ds-flex class="group-list">
    <ds-flex-item
      v-for="group in groups"
      :key="group.id"
      :width="{ base: '98%', sm: '98%', md: '48%' }"
      class="group-item"
    >
      <group-teaser :group="group" />
    </ds-flex-item>
  </ds-flex>
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
.group-item {
  margin: 0 1% 2% 1%;
}
</style>
