<template>
  <ds-flex gutter="small">
    <ds-flex-item :width="{ base: '100%', md: '200px' }">
      <ds-menu :routes="routes" :is-exact="() => true" />
    </ds-flex-item>
    <ds-flex-item :width="{ base: '100%', md: 1 }">
      <transition name="slide-up" appear>
        <group-form @updateGroup="updateGroup" :group="group" :update="true" />
      </transition>
    </ds-flex-item>
  </ds-flex>
</template>

<script>
import GroupForm from '~/components/Group/GroupForm'
import { groupQuery, updateGroupMutation } from '~/graphql/groups.js'
import { mapGetters } from 'vuex'

export default {
  components: {
    GroupForm,
  },
  computed: {
    routes() {
      return [
        {
          name: 'default',
          path: ``,
        },
        {
          name: 'members',
          path: ``,
        },
        {
          name: 'social media',
          path: ``,
        },
        {
          name: 'invite link',
          path: ``,
        },
      ]
    },
    ...mapGetters({
      user: 'auth/user',
    }),
  },
  async asyncData(context) {
    console.log('asyncData start')
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
    console.log('asyncData group', group)
    console.log('asyncData id', id)
    console.log('asyncData group.myRole', group.myRole)
    if (group.myRole !== 'owner') {
      error({ statusCode: 403, message: 'NONONNNO' })
    }
    return { group }
  },
  methods: {
    async updateGroup(value) {
        console.log('updateGroup form', value)
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
