<template>
  <div>
    <os-card>
      <ds-heading tag="h3">{{ $t('group.general') }}</ds-heading>
      <ds-space margin="large" />
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
    async updateGroup(value) {
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
      }
      let responseId, responseSlug
      try {
        await this.$apollo.mutate({
          mutation: updateGroupMutation(),
          variables,
          update: (_store, { data }) => {
            const { id: groupId, slug: groupSlug } = data.UpdateGroup
            responseId = groupId
            responseSlug = groupSlug
          },
        })
        this.$toast.success(this.$t('group.updatedGroup'))
        this.$router.push({
          name: 'groups-id-slug',
          params: { id: responseId, slug: responseSlug },
        })
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
}
</script>
