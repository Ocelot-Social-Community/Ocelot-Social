<template>
  <dropdown class="avatar-menu" offset="8" :placement="placement">
    <template #default="{ toggleMenu }">
      <a
        class="avatar-menu-trigger"
        :href="
          $router.resolve({
            name: 'profile-id-slug',
            params: { id: user.id, slug: user.slug },
          }).href
        "
        @click.prevent="toggleMenu"
      >
        <profile-avatar
          :profile="user"
          size="small"
          :showProfileNameTitle="false"
          v-tooltip="{
            content: $t('header.avatarMenu.button.tooltip'),
            placement: 'bottom-start',
          }"
        />
        <base-icon class="dropdown-arrow" name="angle-down" />
      </a>
    </template>
    <template #popover="{ closeMenu }">
      <div class="avatar-menu-popover">
        {{ $t('login.hello') }}
        <b>{{ userName }}</b>
        <template v-if="user.role !== 'user'">
          <ds-text color="softer" size="small" style="margin-bottom: 0">
            {{ user.role | camelCase }}
          </ds-text>
        </template>
        <hr />
        <ds-menu :routes="routes" :matcher="matcher">
          <ds-menu-item
            slot="menuitem"
            slot-scope="item"
            :route="item.route"
            :parents="item.parents"
            @click.native="
              closeMenu(false)
              $emit('toggle-Mobile-Menu-view')
            "
          >
            <base-icon :name="item.route.icon" />
            {{ item.route.name }}
          </ds-menu-item>
        </ds-menu>
        <hr />
        <nuxt-link class="logout-link" :to="{ name: 'logout' }">
          <base-icon name="sign-out" />
          {{ $t('login.logout') }}
        </nuxt-link>
      </div>
    </template>
  </dropdown>
</template>

<script>
import { mapGetters } from 'vuex'
import Dropdown from '~/components/Dropdown'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'

export default {
  components: {
    Dropdown,
    ProfileAvatar,
  },
  props: {
    placement: { type: String, default: 'top-end' },
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
      isModerator: 'auth/isModerator',
      isAdmin: 'auth/isAdmin',
    }),
    routes() {
      if (!this.user.slug) {
        return []
      }
      const routes = [
        {
          name: this.$t('header.avatarMenu.myProfile'),
          path: `/profile/${this.user.id}/${this.user.slug}`,
          icon: 'user',
        },
        {
          name: this.$t('header.avatarMenu.groups'),
          path: '/groups',
          icon: 'users',
        },
        {
          name: this.$t('header.avatarMenu.map'),
          path: `/map`,
          icon: 'globe',
        },
        {
          name: this.$t('header.avatarMenu.chats'),
          path: `/chat`,
          icon: 'chat-bubble',
        },
        {
          name: this.$t('header.avatarMenu.notifications'),
          path: '/notifications',
          icon: 'bell',
        },
        {
          name: this.$t('settings.name'),
          path: `/settings`,
          icon: 'cogs',
        },
      ]
      if (this.isModerator) {
        routes.push({
          name: this.$t('moderation.name'),
          path: `/moderation`,
          icon: 'balance-scale',
        })
      }
      if (this.isAdmin) {
        routes.push({
          name: this.$t('admin.name'),
          path: `/admin`,
          icon: 'shield',
        })
      }
      return routes
    },
    userName() {
      const { name } = this.user || {}
      return name || this.$t('profile.userAnonym')
    },
  },
  methods: {
    matcher(url, route) {
      if (url.indexOf('/profile') === 0) {
        // do only match own profile
        return this.$route.path === url
      }
      return this.$route.path.indexOf(url) === 0
    },
  },
}
</script>

<style lang="scss">
.avatar-menu {
  margin: $space-xxx-small 0px 0px $space-xx-small;
}
.avatar-menu-trigger {
  user-select: none;
  display: flex;
  align-items: center;
  padding-left: $space-xx-small;

  > .profile-avatar {
    margin-right: $space-xx-small;
  }
}
.avatar-menu-popover {
  padding-top: $space-x-small;
  padding-bottom: $space-x-small;
  hr {
    color: $color-neutral-90;
    background-color: $color-neutral-90;
  }
  .logout-link {
    color: $text-color-danger;
    padding-top: $space-xx-small;
    &:hover {
      color: color.adjust($text-color-danger, $lightness: -10%);
    }
  }
}
</style>
