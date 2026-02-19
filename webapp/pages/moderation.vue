<template>
  <div>
    <h1 class="ds-heading ds-heading-h1">
      {{ $t('moderation.name') }}
    </h1>
    <div class="ds-flex ds-flex-gap-small moderation-layout">
      <div class="moderation-layout__sidebar">
        <ds-menu :routes="routes" />
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
export default {
  middleware: ['isModerator'],
  computed: {
    routes() {
      return [
        {
          name: this.$t('moderation.reports.name'),
          path: `/moderation`,
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
