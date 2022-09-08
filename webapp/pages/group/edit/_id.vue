<template>
  <div>
    <ds-page-title heading="Group Setting"></ds-page-title>
    <ds-flex gutter="small">
      <ds-flex-item :width="{ base: '100%', md: '200px' }">
        <ds-list>
          <ds-list-item>
            <div @click="menu = 'default'">
              <ds-text :color="menu === 'default' ? 'primary' : ''" Group data>Group Data</ds-text>
            </div>
          </ds-list-item>
          <ds-list-item>
            <div @click="menu = 'members'">
              <ds-text :color="menu === 'members' ? 'primary' : ''" Group data>Members</ds-text>
            </div>
          </ds-list-item>
          <ds-list-item>
            <div @click="menu = 'socialMedia'">
              <ds-text :color="menu === 'socialMedia' ? 'primary' : ''" Group data>
                Social Media
              </ds-text>
            </div>
          </ds-list-item>
          <ds-list-item>
            <div @click="menu = 'links'">
              <ds-text :color="menu === 'links' ? 'primary' : ''" Group data>Links</ds-text>
            </div>
          </ds-list-item>
        </ds-list>
      </ds-flex-item>
      <ds-flex-item :width="{ base: '100%', md: 1 }">
        <group-form
          v-show="menu === 'default'"
          @updateGroup="updateGroup"
          :group="group"
          :update="true"
        />
        <group-member v-show="menu === 'members'" />
        <div v-show="menu === 'socialMedia'">Social Media</div>
        <group-link v-show="menu === 'links'" />
      </ds-flex-item>
    </ds-flex>
  </div>
</template>

<script>
import GroupForm from '~/components/Group/GroupForm'
import GroupMember from '~/components/Group/GroupMember'
import GroupLink from '~/components/Group/GroupLink'
import { groupQuery, updateGroupMutation } from '~/graphql/groups.js'
import { mapGetters } from 'vuex'

export default {
  components: {
    GroupForm,
    GroupMember,
    GroupLink,
  },
  data() {
    return {
      menu: 'default',
    }
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
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
