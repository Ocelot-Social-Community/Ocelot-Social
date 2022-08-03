<template>
  <div>
    <div>my groups</div>
    <group-teaser />
  </div>
</template>
<script>
import GroupTeaser from '~/components/GroupTeaser/GroupTeaser.vue'

export default {
  name: 'MyGroups',
  components: {
    GroupTeaser,
  },
}
</script>
