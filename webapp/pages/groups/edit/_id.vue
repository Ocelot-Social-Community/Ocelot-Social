<template>
  <div>
    <div class="ds-my-small">
      <h1 class="ds-heading ds-heading-h1">{{ $t('group.editGroupSettings.title') }}</h1>
      <h2 class="ds-heading ds-heading-h2">
        {{ $t('group.editGroupSettings.groupTitle') }}
        <nuxt-link :to="{ name: 'groups-id-slug', params: { slug: group.slug, id: group.id } }">
          {{ group.name }}
        </nuxt-link>
      </h2>
    </div>
    <div class="ds-my-large"></div>
    <div class="ds-flex ds-flex-gap-small group-edit-layout">
      <div class="group-edit-layout__sidebar">
        <ds-menu :routes="routes" :is-exact="() => true" />
      </div>
      <div class="group-edit-layout__main">
        <transition name="slide-up" appear>
          <nuxt-child :group="group" @update-invite-codes="updateInviteCodes" />
        </transition>
      </div>
    </div>
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

<style lang="scss">
.group-edit-layout__sidebar,
.group-edit-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-medium} {
  .group-edit-layout__sidebar {
    flex: 0 0 200px;
    width: 200px;
  }
  .group-edit-layout__main {
    flex: 1 0 0;
  }
}
</style>
