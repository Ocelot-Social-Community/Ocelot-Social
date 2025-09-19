<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h1">
        {{ heading }}
      </ds-heading>
      <ds-heading v-if="group && group.id && group.slug" tag="h2">
        {{ $t('post.viewPost.forGroup.title') }}
        <nuxt-link :to="{ name: 'groups-id-slug', params: { slug: group.slug, id: group.id } }">
          {{ group.name }}
        </nuxt-link>
      </ds-heading>
    </ds-space>
    <ds-space margin="large" />
    <ds-flex gutter="small">
      <ds-flex-item :width="{ base: '100%', md: '200px' }">
        <ds-menu :routes="routes">
          <ds-menu-item
            @click.prevent="switchPostType($event, item)"
            slot="menuitem"
            slot-scope="item"
            :route="item.route"
            class="post-type-menu-item"
          >
            {{ item.route.name }}
          </ds-menu-item>
        </ds-menu>
      </ds-flex-item>
      <ds-flex-item :width="{ base: '100%', md: 1 }">
        <transition name="slide-up" appear>
          <contribution-form :group="group" :createEvent="createEvent" />
        </transition>
      </ds-flex-item>
    </ds-flex>
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
    if (groupId) this.$router.replace(`/post/create/${type}`) // remove query that the route hits one of the menu paths
    return {
      groupId,
      // Wolle: createEvent: false,
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
    // Wolle: groupId() {
    //   const { groupId = null } = this.$route.query
    //   if (groupId) this.$router.replace(`/post/create/${this.type}`) // remove query that the route hits one of the menu paths
    //   return groupId
    // },
    group() {
      return this.Group && this.Group[0] ? this.Group[0] : null
    },
    heading() {
      return !this.createEvent
        ? this.$t('post.createNewPost.title') // Wolle: change to article?
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
          // Wolle: followedByCount: this.followedByCount,
          // followingCount: this.followingCount,
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
      // Wolle: if (route.route.type.toLowerCase() === 'event') {
      //   this.createEvent = true
      // } else {
      //   this.createEvent = false
      // }
      const { type: oldType } = this.$route.params
      const newType = route.route.type.toLowerCase()
      if (newType !== oldType) {
        this.type = newType
        // if (this.type === 'event') {
        //   this.createEvent = true
        // } else {
        //   this.createEvent = false
        // }
        // console.log('this.createEvent: ', this.createEvent)
        if (this.groupId) {
          this.$router.replace(`/post/create/${this.type}/?groupId=${this.groupId}`)
        } else {
          this.$router.replace(`/post/create/${this.type}`)
        }
      }
      // hacky way to set active element
      // Wolle
      // const menuItems = document.querySelectorAll('.post-type-menu-item')
      // menuItems.forEach((menuItem) => {
      //   menuItem.firstChild.classList.remove('router-link-exact-active', 'router-link-active')
      // })
      // event.target.classList.add('router-link-exact-active')
    },
  },
}
</script>

<style lang="scss">
.inactive-tab-button {
  background-color: #ff000000 !important;
  color: 'whitesmoke' !important;
}
.group-create-title {
  font-size: 30px;
  text-align: center;
}

// Wolle: copy hover effect from ghost button to use for ds-card
.create-form-btn:not(.ds-card-primary):hover {
  background-color: #faf9fa;
}
.create-form-btn .ds-button-ghost:hover {
  background-color: transparent;
}

.menu-item-active {
  color: $color-primary;
  border-left: 2px solid $color-primary;
  background-color: #faf9fa;
}
</style>

<style lang="scss" scoped>
.ds-heading {
  margin-top: 0;
}
</style>
