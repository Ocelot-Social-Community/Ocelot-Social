<template>
  <div>
    <h1 class="ds-heading ds-heading-h1">{{ $t('admin.name') }}</h1>
    <os-card v-if="areaHasNoAccessibleRoute">
      <div class="ds-mb-large ds-space-centered" data-test="area-no-access">
        <div class="ds-mb-large">
          <img :src="errorIconPath" width="40" />
        </div>
        <p class="ds-text">{{ $t('site.error-occurred') }}</p>
      </div>
    </os-card>
    <div v-else class="ds-flex ds-flex-gap-small admin-layout">
      <area-menu
        :routes="accessibleRoutes"
        :matcher="matcher"
        :is-exact="() => true"
        :aria-label="$t('admin.name')"
      />
      <div class="admin-layout__main">
        <transition name="slide-up" appear>
          <nuxt-child />
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import AreaMenu from '~/components/_new/generic/AreaMenu/AreaMenu'
import areaNavigation from '~/mixins/areaNavigation'

export default {
  components: {
    OsCard,
    AreaMenu,
  },
  mixins: [areaNavigation],
  middleware: ['isAdmin'],
  data() {
    return {
      errorIconPath: '/img/svg/emoji/cry.svg',
      // Whether at least one branding is baked in (served /branding/manifest.json). The Branding
      // tab only appears when there is something to view/switch. Fetched client-side.
      hasBrandings: false,
    }
  },
  fetchOnServer: false,
  async fetch() {
    try {
      const res = await fetch('/branding/manifest.json')
      const manifest = res.ok ? await res.json() : []
      this.hasBrandings = Array.isArray(manifest) && manifest.length > 0
    } catch (error) {
      // res.ok already handles the expected "no manifest" case above, so this only fires on real
      // network/parse errors — surface them instead of failing silently. Fallback stays unchanged.
      // eslint-disable-next-line no-console
      console.error('admin: failed to load /branding/manifest.json', error)
      this.hasBrandings = false
    }
  },
  computed: {
    // Every admin tab with the permission(s) that make its page usable. The
    // areaNavigation mixin filters this to accessibleRoutes (sidebar) and redirects
    // away from a tab the viewer can't use. Categories/hashtags are open read pages
    // (no dedicated permission); invite maps to role.manage (admin-initiated signup).
    allRoutes() {
      return [
        {
          name: this.$t('admin.dashboard.name'),
          path: '/admin',
          permissions: ['network.statistics.read'],
        },
        {
          name: this.$t('admin.users.name'),
          path: '/admin/users',
          permissions: ['user.email.readAny', 'role.manage', 'badge.manage', 'user.delete.any'],
        },
        {
          name: this.$t('moderation.reports.name'),
          path: '/admin/reports',
          permissions: ['content.moderate'],
        },
        {
          name: this.$t('admin.categories.name'),
          path: '/admin/categories',
          permissions: [],
        },
        {
          name: this.$t('admin.hashtags.name'),
          path: '/admin/hashtags',
          permissions: [],
        },
        {
          name: this.$t('admin.invites.name'),
          path: '/admin/invite',
          permissions: ['role.manage'],
        },
        {
          name: this.$t('admin.donations.name'),
          path: '/admin/donations',
          permissions: ['donation.manage'],
        },
        {
          name: this.$t('admin.config.name'),
          path: '/admin/config',
          permissions: ['policy.manage'],
        },
        {
          name: this.$t('admin.policy.name'),
          path: '/admin/policy',
          permissions: ['policy.manage'],
        },
        {
          name: this.$t('admin.roles.name'),
          path: '/admin/roles',
          permissions: ['role.manage'],
        },
        {
          name: this.$t('admin.api-keys.name'),
          path: '/admin/api-keys',
          permissions: ['apiKey.administer'],
          policy: 'apiKeysEnabled',
        },
        // Only when at least one branding is baked in (hasBrandings, from the manifest).
        ...(this.hasBrandings
          ? [
              {
                name: this.$t('admin.branding.name'),
                path: '/admin/branding',
                permissions: ['branding.manage'],
              },
            ]
          : []),
      ]
    },
  },
  methods: {
    // Highlight the active item by path only, so query params (e.g. the user-list
    // ?q=… search string) don't drop the highlight.
    matcher(url) {
      return !!this.$route && this.$route.path === url
    },
  },
}
</script>

<style>
/*  AreaMenu owns its own responsive width (full-width select on narrow viewports, */
/*  200px sidebar from 600px up). min-width: 0 lets the main column shrink */
/*  below its content's intrinsic width (e.g. the wide users table), so it stays beside */
/*  the menu instead of wrapping to a second row under it; the content can then scroll/wrap. */
.admin-layout__main {
  flex: 1 1 0;
  min-width: 0;
}
</style>
