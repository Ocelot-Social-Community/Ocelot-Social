<template>
  <div>
    <ds-section>
      <h1 class="ds-heading ds-heading-h1">{{ group.name }}</h1>
      <div class="">{{$t('group.settings')}}</div>
    </ds-section>
    <ds-space margin="large">
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
    </ds-space>
    <ds-space centered>
      <nuxt-link to="/my-groups">{{$t('group.back')}}</nuxt-link>
    </ds-space>
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
          name: $t('group.general'), 
          path: `/group/edit/${this.group.id}`,
        },
        {
          name: $t('group.members'),
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
}
</script>
