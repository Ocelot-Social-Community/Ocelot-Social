<template>
  <ds-flex class="group-list">
    <ds-flex-item 
      v-for="group in groups"
      :key="group.id" 
      :width="{ base: '47%' }">
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
<style lang="scss">
.ds-flex-item {
  margin: 0em 1em 2em 1em;
}
</style>
