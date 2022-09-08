<template>
  <div>
    <h2>Create Groupe</h2>
    <ds-flex :width="{ base: '100%' }" gutter="base">
      <ds-flex-item :width="{ base: '100%', md: 5 }">
        <group-form @createGroup="createGroup" />
      </ds-flex-item>
      <ds-flex-item :width="{ base: '100%', md: 1 }">&nbsp;</ds-flex-item>
    </ds-flex>
    <hr />
    <group-member />
  </div>
</template>

<script>
import GroupForm from '~/components/Group/GroupForm'
import GroupMember from '~/components/Group/GroupMember'
import { createGroupMutation } from '~/graphql/groups.js'

export default {
  components: {
    GroupForm,
    GroupMember,
  },
  data() {
    return {
      createGroupData: {},
    }
  },
  methods: {
    async createGroup(value) {
      try {
        await this.$apollo.mutate({
          mutation: createGroupMutation,
          variables: value,
          update: (_, { data: { createGroupData } }) => {
            // const { sendNotificationEmails } = createGroup
            // this.setCreateGroup({
            //   ...this.createGroup,
            //   sendNotificationEmails,
            // })
            this.$toast.success(this.$t('group.group-created'))
          },
        })
      } catch (error) {
        // this.notifyByEmail = !this.notifyByEmail
        this.$toast.error(error.message)
      }
    },
  },
}
</script>
