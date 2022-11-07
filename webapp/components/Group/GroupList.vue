<template>
  <div class="group-list">
    <ds-space margin-bottom="small" v-for="group in groups" :key="group.id">
      <group-teaser :group="group" />
    </ds-space>
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
