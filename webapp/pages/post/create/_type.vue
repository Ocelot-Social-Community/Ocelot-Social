<template>
  <div>
    <div class="ds-my-small">
      <h1 class="ds-heading ds-heading-h1">
        {{ heading }}
      </h1>
      <h2 v-if="group && group.id && group.slug" class="ds-heading ds-heading-h2">
        {{ $t('post.viewPost.forGroup.title') }}
        <nuxt-link :to="{ name: 'groups-id-slug', params: { slug: group.slug, id: group.id } }">
          {{ group.name }}
        </nuxt-link>
      </h2>
    </div>
    <div class="ds-my-large"></div>
    <div class="ds-flex ds-flex-gap-small post-create-layout">
      <div class="post-create-layout__sidebar">
        <ds-menu :routes="routes">
          <ds-menu-item
            @click.prevent="switchPostType($event, item)"
            slot="menuitem"
            slot-scope="item"
            :route="item.route"
          >
            {{ item.route.name }}
          </ds-menu-item>
        </ds-menu>
      </div>
      <div class="post-create-layout__main">
        <transition name="slide-up" appear>
          <contribution-form :group="group" :createEvent="createEvent" />
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import { groupQuery } from '~/graphql/groups'
import ContributionForm from '~/components/ContributionForm/ContributionForm'

export default {
  components: {
    ContributionForm,
  },
  data() {
    const { groupId = null } = this.$route.query
    const { type } = this.$route.params
    if (groupId) this.$router.replace(`/post/create/${type}`) // remove query so that the route hits one of the menu paths
    return {
      groupId,
      type,
    }
  },
  async asyncData({ route, redirect }) {
    // http://localhost:3000/post/create/type
    // http://localhost:3000/post/create/type?groupId=id
    const {
      params: { type },
      query: { groupId },
    } = route
    if (!['article', 'event'].includes(type)) {
      const defaultType = 'article'
      let path = `/post/create/${defaultType}`
      if (groupId) path += `?groupId=${groupId}`
      redirect(path)
    }
  },
  computed: {
    group() {
      return this.Group && this.Group[0] ? this.Group[0] : null
    },
    heading() {
      return !this.createEvent
        ? this.$t('post.createNewArticle.title')
        : this.$t('post.createNewEvent.title')
    },
    routes() {
      return [
        {
          name: this.$t('post.name'),
          path: `/post/create/article`,
          type: 'article',
        },
        {
          name: this.$t('post.event'),
          path: `/post/create/event`,
          type: 'event',
        },
      ]
    },
    createEvent() {
      return this.type === 'event'
    },
  },
  apollo: {
    Group: {
      query() {
        return groupQuery(this.$i18n)
      },
      variables() {
        return {
          id: this.groupId,
        }
      },
      skip() {
        return !this.groupId
      },
      error(error) {
        this.$toast.error(error.message)
      },
      fetchPolicy: 'cache-and-network',
    },
  },
  methods: {
    switchPostType(_event, route) {
      const { type: oldType } = this.$route.params
      const newType = route.route.type.toLowerCase()
      if (newType !== oldType) {
        this.type = newType
        if (this.groupId) {
          this.$router.replace(`/post/create/${this.type}/?groupId=${this.groupId}`)
        } else {
          this.$router.replace(`/post/create/${this.type}`)
        }
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.ds-heading {
  margin-top: 0;
}

.post-create-layout__sidebar,
.post-create-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-medium} {
  .post-create-layout__sidebar {
    flex: 0 0 200px;
    width: 200px;
  }
  .post-create-layout__main {
    flex: 1 0 0;
  }
}
</style>
