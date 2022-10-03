<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h1">{{ $t('group.editGroupSettings.title') }}</ds-heading>
      <ds-heading tag="h2">
        {{ $t('group.editGroupSettings.groupName', { name: group.name }) }}
      </ds-heading>
    </ds-space>
    <ds-space margin="large" />
    <ds-flex gutter="small">
      <ds-flex-item :width="{ base: '100%', md: '200px' }">
        <ds-menu :routes="routes" :is-exact="() => true" />
      </ds-flex-item>
      <ds-flex-item :width="{ base: '100%', md: 1 }">
        <transition name="slide-up" appear>
          <nuxt-child :group="group" />
        </transition>
      </ds-flex-item>
    </ds-flex>
  </div>
</template>

<script>
import { groupQuery } from '~/graphql/groups.js'
import { mapGetters } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    routes() {
      return [
        {
          name: this.$t('group.general'),
          path: `/group/edit/${this.group.id}`,
        },
        {
          name: this.$t('group.members'),
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
      query: groupQuery(), // "this.$i18n" is undefined here, so we use default lang
      variables: { id },
    })
    if (group.myRole !== 'owner') {
      error({ statusCode: 403, message: 'NONONNNO' })
    }
    return { group }
  },
}
</script>
