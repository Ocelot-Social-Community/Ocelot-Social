<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h1">
        {{ heading }}
      </ds-heading>
      <ds-heading
        v-if="
          contribution && contribution.group && contribution.group.id && contribution.group.slug
        "
        tag="h2"
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
      </ds-heading>
    </ds-space>
    <ds-space margin="large" />
    <ds-flex :width="{ base: '100%' }" gutter="base">
      <ds-flex-item :width="{ base: '100%', md: 3 }">
        <contribution-form
          :contribution="contribution"
          :group="contribution && contribution.group ? contribution.group : null"
          :createEvent="contribution && contribution.postType[0] === 'Event'"
        />
      </ds-flex-item>
      <ds-flex-item :width="{ base: '100%', md: 1 }">&nbsp;</ds-flex-item>
    </ds-flex>
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
