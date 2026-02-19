<template>
  <div>
    <div class="ds-my-small">
      <h1 class="ds-heading ds-heading-h1">{{ $t('group.createNewGroup.title') }}</h1>
    </div>
    <div class="ds-my-large"></div>
    <div class="ds-container ds-container-x-large">
      <os-card>
        <div class="ds-my-large">
          <div class="ds-flex ds-flex-gap-base group-create-layout">
            <div class="group-create-layout__main">
              <div class="ds-container ds-container-x-large">
                <group-form @createGroup="createGroup" />
              </div>
            </div>
            <div class="group-create-layout__aside">&nbsp;</div>
          </div>
        </div>
      </os-card>
    </div>
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import GroupForm from '~/components/Group/GroupForm'
import { createGroupMutation } from '~/graphql/groups.js'

export default {
  components: {
    OsCard,
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
      let responseId, responseSlug
      try {
        await this.$apollo.mutate({
          mutation: createGroupMutation(),
          variables,
          update: (_store, { data }) => {
            const { id: groupId, slug: groupSlug } = data.CreateGroup
            responseId = groupId
            responseSlug = groupSlug
          },
        })
        this.$toast.success(this.$t('group.groupCreated'))
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

<style lang="scss">
.group-create-layout__main,
.group-create-layout__aside {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-medium} {
  .group-create-layout__main {
    flex: 5 0 0;
  }
  .group-create-layout__aside {
    flex: 1 0 0;
  }
}
</style>
