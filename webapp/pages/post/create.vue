<template>
  <div>
    <ds-flex gutter="small">
      <ds-flex-item :width="{ base: '100%', md: '200px' }">
        <ds-menu class="post-type-menu" :routes="routes">
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
    return {
      groupId,
      createEvent: false,
    }
  },
  computed: {
    group() {
      return this.Group && this.Group[0] ? this.Group[0] : null
    },
    routes() {
      return [
        {
          name: this.$t('post.name'),
          path: `/post/create`,
          type: 'post',
        },
        {
          name: this.$t('post.event'),
          path: `/`,
          type: 'event',
        },
      ]
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
          // followedByCount: this.followedByCount,
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
    switchPostType(event, route) {
      if (route.route.type.toLowerCase() === 'event') {
        this.createEvent = true
      } else {
        this.createEvent = false
      }
      // hacky way to set active element
      const menuItems = document.querySelectorAll('.post-type-menu-item')
      menuItems.forEach((menuItem) => {
        menuItem.firstChild.classList.remove('router-link-exact-active', 'router-link-active')
      })
      event.target.classList.add('router-link-exact-active')
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

// copy hover effect from ghost button to use for ds-card
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

@media screen and (min-width: 768px) {
  .post-type-menu {
    margin-top: 39px;
  }
}
</style>
