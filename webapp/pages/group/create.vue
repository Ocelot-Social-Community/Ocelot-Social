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
      console.log("createGroup", form)
      console.log("createGroup form.categoryIds", form.categoryIds)
      console.log("createGroup form.radius", form.radius)
      try {
        await this.$apollo.mutate({
          mutation: createGroupMutation,
          variables: {
            name: form.name,
            about: form.about,
            description: form.description,
            groupType: form.status,
            actionRadius: form.radius,
            categoryIds: form.formData.categoryIds,
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
