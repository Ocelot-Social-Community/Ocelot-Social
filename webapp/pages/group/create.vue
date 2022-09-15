<template>
  <div>
    <ds-section>
      <h1 class="ds-heading ds-heading-h1">Create New Groupe</h1>
    </ds-section>
    <ds-space margin="large">
      <ds-flex :width="{ base: '100%' }" gutter="base">
        <ds-flex-item :width="{ base: '100%', md: 5 }">
          <group-form @createGroup="createGroup" />
        </ds-flex-item>
        <ds-flex-item :width="{ base: '100%', md: 1 }">&nbsp;</ds-flex-item>
      </ds-flex>
    </ds-space>
  </div>
</template>

<script>
import GroupForm from '~/components/Group/GroupForm'
import { createGroupMutation } from '~/graphql/groups.js'

export default {
  components: {
    GroupForm,
  },
  data() {
    return {
      createGroupData: {},
    }
  },
  methods: {
    async createGroup(value) {
      console.log('createGroup')
      console.log(value)
      const { name, about, description, groupType, actionRadius, locationName, categoryIds } = value
      const variables = { name, about, description, groupType, actionRadius, locationName, categoryIds }
      try {
        await this.$apollo.mutate({
          mutation: createGroupMutation,
          variables,
        })
        this.$toast.success(this.$t('group.group-created'))
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
}
</script>
