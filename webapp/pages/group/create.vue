<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h1">{{ $t('group.createNewGroup.title') }}</ds-heading>
    </ds-space>
    <ds-space margin="large" />
    <ds-container>
      <base-card>
        <ds-space margin="large">
          <ds-flex :width="{ base: '100%' }" gutter="base">
            <ds-flex-item :width="{ base: '100%', md: 5 }">
              <ds-container>
                <group-form @createGroup="createGroup" />
              </ds-container>
            </ds-flex-item>
            <ds-flex-item :width="{ base: '100%', md: 1 }">&nbsp;</ds-flex-item>
          </ds-flex>
        </ds-space>
      </base-card>
    </ds-container>
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
      const { name, about, description, groupType, actionRadius, locationName, categoryIds } = value
      const variables = {
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
          mutation: createGroupMutation(),
          variables,
        })
        this.$toast.success(this.$t('group.groupCreated'))
        this.$router.history.push('/my-groups')
        // Wolle: refetch groups on '/my-groups'
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
}
</script>
