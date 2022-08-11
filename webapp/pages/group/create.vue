<template>
  <div>
  <ds-flex :width="{ base: '100%' }" gutter="base">
    <ds-flex-item :width="{ base: '100%', md: 5 }">
      <new-group-form />
    </ds-flex-item>
    <ds-flex-item :width="{ base: '100%', md: 1 }">&nbsp;</ds-flex-item>
  </ds-flex>
  <hr />
  <group-member />
</div>
</template>

<script>
import NewGroupForm from '~/components/GroupForm/GroupForm'
import GroupMember from '~/components/GroupMember/GroupMember.vue'

export default {
  components: {
    NewGroupForm,
    GroupMember,
  },
}
</script>
