<template>
  <div>
    <div class="ds-my-small">
      <h1 class="ds-heading ds-heading-h1">
        {{ heading }}
      </h1>
      <h2
        v-if="
          contribution && contribution.group && contribution.group.id && contribution.group.slug
        "
        class="ds-heading ds-heading-h2"
      >
        {{ $t('post.editPost.forGroup.title') }}
        <nuxt-link
          :to="{
            name: 'groups-id-slug',
            params: { slug: contribution.group.slug, id: contribution.group.id },
          }"
        >
          {{ contribution.group.name }}
        </nuxt-link>
      </h2>
    </div>
    <div class="ds-my-large"></div>
    <div class="ds-flex ds-flex-gap-small post-edit-layout">
      <div class="post-edit-layout__sidebar">
        <os-menu :routes="routes" link-tag="a" :matcher="postTypeMatcher">
          <os-menu-item
            @click.prevent="switchPostType($event, item)"
            slot="menuitem"
            slot-scope="item"
            :route="item.route"
          >
            {{ item.route.name }}
          </os-menu-item>
        </os-menu>
      </div>
      <div class="post-edit-layout__main">
        <contribution-form
          :contribution="contribution"
          :group="contribution && contribution.group ? contribution.group : null"
          :post-type="currentPostType"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { OsMenu, OsMenuItem } from '@ocelot-social/ui'
import ContributionForm from '~/components/ContributionForm/ContributionForm.vue'
import PostQuery from '~/graphql/PostQuery'
import { mapGetters } from 'vuex'

export default {
  components: {
    ContributionForm,
    OsMenu,
    OsMenuItem,
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    heading() {
      return this.currentPostType === 'Event'
        ? this.$t('post.editPost.event')
        : this.$t('post.editPost.title')
    },
    routes() {
      return [
        { name: this.$t('post.name'), path: '#', type: 'Article' },
        { name: this.$t('post.event'), path: '#', type: 'Event' },
      ]
    },
    postTypeMatcher() {
      const current = this.currentPostType
      return (_url, route) => route.type === current
    },
  },
  data() {
    return {
      contribution: {
        postType: ['Article'],
      },
      currentPostType: 'Article',
    }
  },
  async asyncData(context) {
    const {
      app,
      store,
      error,
      params: { id },
    } = context
    const client = app.apolloProvider.defaultClient
    const {
      data: {
        Post: [contribution],
      },
    } = await client.query({
      query: PostQuery(app.$i18n),
      variables: { id },
    })
    if (contribution.author.id !== store.getters['auth/user'].id) {
      error({ statusCode: 403, message: 'error-pages.cannot-edit-post' })
    }
    return { contribution, currentPostType: contribution.postType[0] || 'Article' }
  },
  methods: {
    switchPostType(_event, item) {
      this.currentPostType = item.route.type
    },
  },
}
</script>

<style lang="scss" scoped>
.ds-heading {
  margin-top: 0;
}

.post-edit-layout__sidebar,
.post-edit-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-medium} {
  .post-edit-layout__sidebar {
    flex: 0 0 200px;
    width: 200px;
  }
  .post-edit-layout__main {
    flex: 1 0 0;
  }
}
</style>
