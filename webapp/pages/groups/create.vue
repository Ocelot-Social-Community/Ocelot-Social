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
                <group-form ref="groupForm" @createGroup="createGroup" />
              </div>
            </div>
            <div class="group-create-layout__aside">&nbsp;</div>
          </div>
        </div>
      </os-card>
    </div>
    <confirm-modal
      v-if="showLeaveConfirmModal"
      :modalData="leaveConfirmModalData"
      @close="showLeaveConfirmModal = false"
    />
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import GroupForm from '~/components/Group/GroupForm'
import { createGroupMutation } from '~/graphql/groups.js'
import confirmLeaveIfUnsavedChanges from '~/mixins/confirmLeaveIfUnsavedChanges'

export default {
  middleware: ['groupsEnabled'],
  mixins: [confirmLeaveIfUnsavedChanges],
  components: {
    OsCard,
    ConfirmModal,
    GroupForm,
  },
  data() {
    return {
      createGroupData: {},
    }
  },
  methods: {
    hasUnsavedChanges() {
      return !!this.$refs.groupForm?.hasUnsavedChanges
    },
    async createGroup(value, done) {
      const {
        name,
        about,
        description,
        groupType,
        actionRadius,
        locationName,
        lat,
        lng,
        categoryIds,
        showMembers,
      } = value
      const variables = {
        name,
        about,
        description,
        groupType,
        actionRadius,
        locationName,
        lat,
        lng,
        categoryIds,
        showMembers,
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
        // Before navigating away — clears GroupForm's own unsaved-changes
        // tracking so beforeRouteLeave (confirmLeaveIfUnsavedChanges) doesn't
        // immediately ask to confirm leaving what was just saved.
        done(true)
        this.$router.push({
          name: 'groups-id-slug',
          params: { id: responseId, slug: responseSlug },
        })
      } catch (error) {
        this.$toast.error(error.message)
        done()
      }
    },
  },
}
</script>

<style>
.group-create-layout__main,
.group-create-layout__aside {
  flex: 0 0 100%;
  width: 100%;
}
@media (--vp-tablet-up) {
  .group-create-layout__main {
    flex: 5 0 0;
  }
  .group-create-layout__aside {
    flex: 1 0 0;
  }
}
</style>
