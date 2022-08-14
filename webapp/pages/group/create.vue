<template>
  <div>
  <ds-flex :width="{ base: '100%' }" gutter="base">
    <ds-flex-item :width="{ base: '100%', md: 5 }">
      <new-group-form @createGroup="createGroup"/>
    </ds-flex-item>
    <ds-flex-item :width="{ base: '100%', md: 1 }">&nbsp;</ds-flex-item>
  </ds-flex>
  <hr />
  <group-member />
</div>
</template>

<script>
import NewGroupForm from '~/components/GroupForm/GroupForm'
import GroupMember from '~/components/GroupMember/GroupMember.vue'
import { createGroupMutation } from '~/graphql/groups.js'

export default {
  components: {
    NewGroupForm,
    GroupMember,
  },
  data() {
    return {
      createGroupData: {},
    }
  },
   methods: {
    async createGroup(form) {
      console.log('createGroupMutation', form)
      try {
        await this.$apollo.mutate({
          mutation: createGroupMutation(),
          variables: {
             id: 0,
             name: 'Gruppenname',
             slug: '0',
             about: 'About',
             description: 'Description',
             groupType: 'offen',
             actionRadius: 'GroupActionRadius',
             categoryIds: ['1','2','3']
          },
          update: (_, { data: { createGroupData } }) => {
            console.log(this.createGroupData)
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
