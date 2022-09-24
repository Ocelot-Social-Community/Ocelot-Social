<template>
  <div>
    <base-card>
      <ds-heading tag="h3">{{ $t('group.general') }}</ds-heading>
      <ds-space margin="large" />
      <group-form :group="group" :update="true" @updateGroup="updateGroup" />
    </base-card>
  </div>
</template>

<script>
import GroupForm from '~/components/Group/GroupForm'
import { updateGroupMutation } from '~/graphql/groups.js'

export default {
  components: {
    GroupForm,
  },
  props: {
    group: {
      type: Object,
      required: false,
      default: () => ({}),
    },
  },
  methods: {
    async updateGroup(value) {
      const { id, name, about, description, groupType, actionRadius, locationName, categoryIds } =
        value
      const variables = {
        id,
        name,
        about,
        description,
        groupType,
        actionRadius,
        locationName,
        categoryIds,
      }
      try {
        await this.$apollo.mutate({
          mutation: updateGroupMutation(),
          variables,
        })
        this.$toast.success(this.$t('group.group-updated'))
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
}
</script>
