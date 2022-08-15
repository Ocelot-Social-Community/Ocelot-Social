<template>
  <div>
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
import GroupForm from '~/components/GroupForm/GroupForm'
import GroupMember from '~/components/GroupMember/GroupMember.vue'
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
    async createGroup(form) {
      try {
        await this.$apollo.mutate({
          mutation: createGroupMutation,
          variables: {
            name: 'Gruppenname',
            about: 'About',
            description:
              'Description Description Description Description Description Description Description Description Description Description Description Description ',
            groupType: 'public',
            actionRadius: 'regional',
            categoryIds: ['cat15', 'cat5', 'cat1'],
          },
          update: (_, { data: { createGroupData } }) => {
            // const { sendNotificationEmails } = createGroup
            // this.setCreateGroup({
            //   ...this.createGroup,
            //   sendNotificationEmails,
            // })
            this.$toast.success(this.$t('settings.notifications.success-update'))
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
