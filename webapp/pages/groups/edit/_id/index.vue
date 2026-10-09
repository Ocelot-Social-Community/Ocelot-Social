<template>
  <div>
    <os-card>
      <h3 class="ds-heading ds-heading-h3">{{ $t('group.general') }}</h3>
      <div class="ds-my-large"></div>
      <group-form ref="groupForm" :group="group" :update="true" @updateGroup="updateGroup" />
    </os-card>
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
import { updateGroupMutation } from '~/graphql/groups.js'
import confirmLeaveIfUnsavedChanges from '~/mixins/confirmLeaveIfUnsavedChanges'

export default {
  mixins: [confirmLeaveIfUnsavedChanges],
  components: {
    OsCard,
    ConfirmModal,
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
    hasUnsavedChanges() {
      return !!this.$refs.groupForm?.hasUnsavedChanges
    },
    async updateGroup(value, done) {
      const {
        id,
        slug,
        name,
        about,
        description,
        visibility,
        actionRadius,
        locationName,
        lat,
        lng,
        categoryIds,
      } = value
      const variables = {
        id,
        name,
        slug,
        about,
        description,
        visibility,
        actionRadius,
        locationName,
        lat,
        lng,
        categoryIds,
      }
      try {
        await this.$apollo.mutate({
          mutation: updateGroupMutation(),
          variables,
        })
        this.$toast.success(this.$t('group.updatedGroup'))
        done(true)
      } catch (error) {
        this.$toastBackendError(error)
        done()
      }
    },
  },
}
</script>
