<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h1">{{ $t('group.editGroupSettings.title') }}</ds-heading>
      <ds-heading tag="h2">
        {{ $t('group.editGroupSettings.groupTitle') }}
        <nuxt-link :to="{ name: 'groups-id-slug', params: { slug: group.slug, id: group.id } }">
          {{ group.name }}
        </nuxt-link>
      </ds-heading>
    </ds-space>
    <ds-space margin="large" />
    <ds-flex gutter="small">
      <ds-flex-item :width="{ base: '100%', md: '200px' }">
        <ds-menu :routes="routes" :is-exact="() => true" />
      </ds-flex-item>
      <ds-flex-item :width="{ base: '100%', md: 1 }">
        <transition name="slide-up" appear>
          <nuxt-child :group="group" @update-invite-codes="updateInviteCodes" />
        </transition>
      </ds-flex-item>
    </ds-flex>
  </div>
</template>

<script>
import { groupQuery } from '~/graphql/groups.js'
import { mapGetters } from 'vuex'

export default {
  data() {
    return {
      group: {},
    }
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    routes() {
      return [
        {
          name: this.$t('group.general'),
          path: `/groups/edit/${this.group.id}`,
        },
        {
          name: this.$t('group.members'),
          path: `/groups/edit/${this.group.id}/members`,
        },
        {
          name: this.$t('group.invite-links'),
          path: `/groups/edit/${this.group.id}/invites`,
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
      query: groupQuery(), // "this.$i18n" is undefined here, so we use default lang
      variables: { id },
    })
    if (group.myRole !== 'owner') {
      error({ statusCode: 403, message: 'NONONNNO' })
    }
    return { group }
  },
  methods: {
    updateInviteCodes(inviteCodes) {
      this.group.inviteCodes = inviteCodes
    },
  },
}
</script>

<style lang="scss" scoped>
.ds-heading {
  margin-top: 0;
}
</style>
