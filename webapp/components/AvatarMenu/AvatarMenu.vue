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
        <avatar-image
          :profile="user"
          size="small"
          :showProfileNameTitle="false"
          v-tooltip="{
            content: $t('header.avatarMenu.button.tooltip'),
            placement: 'bottom-start',
          }"
        />
        <os-icon class="dropdown-arrow" :icon="icons.angleDown" />
      </a>
    </template>
    <template #popover="{ closeMenu }">
      <div class="avatar-menu-popover">
        {{ $t('login.hello') }}
        <b>{{ userName }}</b>
        <template v-if="user.roleName && user.roleName !== 'user'">
          <p class="ds-text ds-text-softer ds-text-size-small" style="margin-bottom: 0">
            {{ user.roleName | camelCase }}
          </p>
        </template>
        <hr />
        <os-menu dropdown :routes="routes" :matcher="matcher" link-tag="router-link">
          <template #menuitem="item">
            <os-menu-item
              :route="item.route"
              :parents="item.parents"
              @click.native="
                closeMenu(false)
                $emit('toggle-Mobile-Menu-view')
              "
            >
              <os-icon :icon="item.route.icon" />
              {{ item.route.name }}
            </os-menu-item>
          </template>
        </os-menu>
        <hr />
        <nuxt-link class="logout-link" :to="{ name: 'logout' }">
          <os-icon :icon="icons.signOut" />
          {{ $t('login.logout') }}
        </nuxt-link>
      </div>
    </template>
  </dropdown>
</template>

<script>
import { OsIcon, OsMenu, OsMenuItem } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters } from 'vuex'
import Dropdown from '~/components/Dropdown'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'

export default {
  components: {
    Dropdown,
    OsIcon,
    OsMenu,
    OsMenuItem,
    AvatarImage,
  },
  props: {
    placement: { type: String, default: 'top-end' },
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
      canAccessModeration: 'auth/canAccessModeration',
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
          icon: this.icons.user,
        },
        // The groups feature can be disabled network-wide; hide its entry when off.
        ...(this.$policy.get('groupsEnabled')
          ? [
              {
                name: this.$t('header.avatarMenu.groups'),
                path: '/groups',
                icon: this.icons.users,
              },
            ]
          : []),
        {
          name: this.$t('header.avatarMenu.map'),
          path: `/map`,
          icon: this.icons.globe,
        },
        {
          name: this.$t('header.avatarMenu.chats'),
          path: `/chat`,
          icon: this.icons.chatBubble,
        },
        {
          name: this.$t('header.avatarMenu.notifications'),
          path: '/notifications',
          icon: this.icons.bell,
        },
        {
          name: this.$t('settings.name'),
          path: `/settings`,
          icon: this.icons.cogs,
        },
      ]
      if (this.canAccessModeration) {
        routes.push({
          name: this.$t('moderation.name'),
          path: `/moderation`,
          icon: this.icons.balanceScale,
        })
      }
      if (this.isAdmin) {
        routes.push({
          name: this.$t('admin.name'),
          path: `/admin`,
          icon: this.icons.shield,
        })
      }
      return routes
    },
    userName() {
      const { name } = this.user || {}
      return name || this.$t('profile.userAnonym')
    },
  },
  created() {
    this.icons = iconRegistry
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

<style>
.avatar-menu {
  margin: var(--space-xxx-small) 0px 0px var(--space-xx-small);
}
.avatar-menu-trigger {
  user-select: none;
  display: flex;
  align-items: center;
  padding-left: var(--space-xx-small);

  > .avatar-image {
    margin-right: var(--space-xx-small);
  }
}
.avatar-menu-popover {
  padding-top: var(--space-x-small);
  padding-bottom: var(--space-x-small);
  hr {
    color: var(--color-neutral-90);
    background-color: var(--color-neutral-90);
  }
  .logout-link {
    color: var(--text-color-danger);
    padding-top: var(--space-xx-small);
    &:hover {
      color: color-mix(in srgb, var(--color-danger), black 10%);
    }
  }
}
</style>
