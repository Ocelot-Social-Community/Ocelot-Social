<template>
  <div>
    <os-card>
      <h3 class="ds-heading ds-heading-h3">{{ $t('group.general') }}</h3>
      <div class="ds-my-large"></div>
      <group-form :group="group" :update="true" @updateGroup="updateGroup" />
    </os-card>
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import GroupForm from '~/components/Group/GroupForm'
import { updateGroupMutation } from '~/graphql/groups.js'

export default {
  components: {
    OsCard,
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
    async updateGroup(value, done) {
      const {
        id,
        slug,
        name,
        about,
        description,
        groupType,
        actionRadius,
        locationName,
        categoryIds,
        showMembers,
      } = value
      const variables = {
        id,
        name,
        slug,
        about,
        description,
        groupType,
        actionRadius,
        locationName,
        categoryIds,
        showMembers,
      }
      try {
        await this.$apollo.mutate({
          mutation: updateGroupMutation(),
          variables,
        })
        this.$toast.success(this.$t('group.updatedGroup'))
        done(true)
      } catch (error) {
        this.$toast.error(error.message)
        done()
      }
    },
  },
}
</script>
