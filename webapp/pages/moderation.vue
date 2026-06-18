<template>
  <div>
    <h1 class="ds-heading ds-heading-h1">
      {{ $t('moderation.name') }}
    </h1>
    <os-card v-if="areaHasNoAccessibleRoute">
      <div class="ds-mb-large ds-space-centered" data-test="area-no-access">
        <div class="ds-mb-large">
          <img :src="errorIconPath" width="40" />
        </div>
        <p class="ds-text">{{ $t('site.error-occurred') }}</p>
      </div>
    </os-card>
    <div v-else class="ds-flex ds-flex-gap-small moderation-layout">
      <div class="moderation-layout__sidebar">
        <os-menu :routes="accessibleRoutes" link-tag="router-link" />
      </div>
      <div class="moderation-layout__main">
        <transition name="slide-up" appear>
          <nuxt-child />
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import { OsCard, OsMenu } from '@ocelot-social/ui'
import areaNavigation from '~/mixins/areaNavigation'

export default {
  components: {
    OsCard,
    OsMenu,
  },
  mixins: [areaNavigation],
  // Area access is group-driven (any moderation-group permission); the mixin then
  // redirects to the first accessible sub-page, or shows the error when none is (e.g.
  // a post.pin-only holder: in the moderation group, but with no moderation PAGE).
  middleware: ['canAccessModeration'],
  data() {
    return {
      errorIconPath: '/img/svg/emoji/cry.svg',
    }
  },
  computed: {
    allRoutes() {
      return [
        {
          name: this.$t('moderation.reports.name'),
          path: '/moderation',
          permissions: ['content.moderate'],
        },
        {
          name: this.$t('moderation.users.name'),
          path: '/moderation/users',
          permissions: ['badge.manage', 'user.disable', 'user.delete.any'],
        },
      ]
    },
  },
}
</script>

<style lang="scss">
.moderation-layout__sidebar,
.moderation-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-medium} {
  .moderation-layout__sidebar {
    flex: 0 0 200px;
    width: 200px;
  }
  .moderation-layout__main {
    flex: 1 0 0;
  }
}
</style>
