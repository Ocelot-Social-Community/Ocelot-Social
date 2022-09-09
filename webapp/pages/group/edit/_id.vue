<template>
  <div>
    <ds-page-title heading="Group Setting"></ds-page-title>
    <ds-flex gutter="small">
      <ds-flex-item :width="{ base: '100%', md: '200px' }">
        <ds-menu :routes="routes" :is-exact="() => true" />
      </ds-flex-item>
      <ds-flex-item :width="{ base: '100%', md: 1 }">
        <transition name="slide-up" appear>
          <nuxt-child :group="group" :update="true" @updateGroup="updateGroup" />
        </transition>
      </ds-flex-item>
    </ds-flex>
  </div>
</template>

<script>
import { groupQuery, updateGroupMutation } from '~/graphql/groups.js'
import { mapGetters } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    routes() {
      return [
        {
          name: 'formular',
          path: `/group/edit/${this.group.id}`,
        },
        {
          name: 'members',
          path: `/group/edit/${this.group.id}/members`,
        },
      ]
    },
  },
  async asyncData(context) {
    const {
      app,
      error,
      params: { id },
    } = context
    const client = app.apolloProvider.defaultClient
    const {
      data: {
        Group: [group],
      },
    } = await client.query({
      query: groupQuery,
      variables: { id },
    })
    if (group.myRole !== 'owner') {
      error({ statusCode: 403, message: 'NONONNNO' })
    }
    return { group }
  },
  methods: {
    async updateGroup(value) {
      try {
        await this.$apollo.mutate({
          mutation: updateGroupMutation,
          variables: value,
          update: (_, { data: { updateGroupData } }) => {
            // const { sendNotificationEmails } = createGroup
            // this.setCreateGroup({
            //   ...this.createGroup,
            //   sendNotificationEmails,
            // })
            this.$toast.success(this.$t('group.group-updated'))
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
