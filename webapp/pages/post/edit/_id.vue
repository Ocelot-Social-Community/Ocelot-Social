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
    <div class="ds-flex ds-flex-gap-base post-edit-layout">
      <div class="post-edit-layout__main">
        <contribution-form
          :contribution="contribution"
          :group="contribution && contribution.group ? contribution.group : null"
          :createEvent="contribution && contribution.postType[0] === 'Event'"
        />
      </div>
      <div class="post-edit-layout__aside"></div>
    </div>
  </div>
</template>

<script>
import ContributionForm from '~/components/ContributionForm/ContributionForm.vue'
import PostQuery from '~/graphql/PostQuery'
import { mapGetters } from 'vuex'

export default {
  components: {
    ContributionForm,
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    heading() {
      return this.contribution && this.contribution.postType[0] === 'Event'
        ? this.$t('post.editPost.event')
        : this.$t('post.editPost.title')
    },
  },
  data() {
    return {
      contribution: {
        postType: ['Article'],
      },
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
    return { contribution }
  },
}
</script>

<style lang="scss" scoped>
.ds-heading {
  margin-top: 0;
}

.post-edit-layout__main,
.post-edit-layout__aside {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-medium} {
  .post-edit-layout__main {
    flex: 3 0 0;
  }
  .post-edit-layout__aside {
    flex: 1 0 0;
  }
}
</style>
