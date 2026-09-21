<template>
  <div>
    <div class="ds-my-small">
      <h1 class="ds-heading ds-heading-h1">{{ $t('group.createNewGroup.title') }}</h1>
    </div>
    <div class="ds-my-large"></div>
    <div class="ds-flex ds-flex-gap-base group-create-layout">
      <div class="group-create-layout__sidebar">
        <os-menu :routes="routes" link-tag="router-link">
          <os-menu-item slot="menuitem" slot-scope="item" :route="item.route">
            {{ item.route.name }}
          </os-menu-item>
        </os-menu>
      </div>
      <div class="group-create-layout__main">
        <os-card>
          <div class="ds-my-large">
            <group-form ref="groupForm" @createGroup="createGroup" />
          </div>
        </os-card>
      </div>
    </div>
    <confirm-modal
      v-if="showLeaveConfirmModal"
      :modalData="leaveConfirmModalData"
      @close="showLeaveConfirmModal = false"
    />
  </div>
</template>

<script>
import { OsCard, OsMenu, OsMenuItem } from '@ocelot-social/ui'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import GroupForm from '~/components/Group/GroupForm'
import { createGroupMutation } from '~/graphql/groups.js'
import confirmLeaveIfUnsavedChanges from '~/mixins/confirmLeaveIfUnsavedChanges'

export default {
  middleware: ['groupsEnabled'],
  mixins: [confirmLeaveIfUnsavedChanges],
  components: {
    OsCard,
    OsMenu,
    OsMenuItem,
    ConfirmModal,
    GroupForm,
  },
  data() {
    return {
      createGroupData: {},
    }
  },
  computed: {
    // Modeled on pages/post/create/_type.vue's own left-hand type menu —
    // for now there is only one group-creation flow, so there's nothing to
    // switch between yet (no click handler needed either), but the
    // structure is ready for whichever future group types land here.
    routes() {
      return [
        {
          name: this.$t('group.group'),
          path: '/groups/create',
        },
      ]
    },
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
.group-create-layout__sidebar,
.group-create-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media (--vp-tablet-up) {
  .group-create-layout__sidebar {
    flex: 0 0 200px;
    width: 200px;
  }
  .group-create-layout__main {
    flex: 1 0 0;
  }
}
</style>
