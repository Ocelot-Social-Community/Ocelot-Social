<template>
  <os-card>
    <template v-if="$apollo.loading">
      <div style="text-align: center; padding: 48px 0">
        <os-spinner size="xl" />
      </div>
    </template>
    <template v-else-if="statistics">
      <div class="ds-my-large">
        <div class="ds-flex">
          <div
            v-for="(value, name) in filterStatistics(statistics)"
            :key="name"
            class="admin-stats__item"
          >
            <div class="ds-my-small">
              <os-number :count="value" :label="$t('admin.dashboard.' + name)" :animated="true" />
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="ds-mb-large ds-space-centered">
        <div class="ds-mb-large">
          <img :src="errorIconPath" width="40" />
        </div>
        <p class="ds-text">
          {{ $t('site.error-occurred') }}
        </p>
      </div>
    </template>
  </os-card>
</template>

<script>
import { OsCard, OsNumber, OsSpinner } from '@ocelot-social/ui'
import { Statistics } from '~/graphql/admin/Statistics'

export default {
  components: {
    OsCard,
    OsNumber,
    OsSpinner,
  },
  data() {
    return {
      errorIconPath: '/img/svg/emoji/cry.svg',
      statistics: null,
    }
  },
  apollo: {
    statistics: {
      query: Statistics,
      update(data) {
        return data.statistics
      },
    },
  },
  methods: {
    filterStatistics(data) {
      const { __typename, ...rest } = data
      return rest
    },
  },
}
</script>

<style lang="scss">
.admin-stats__item {
  flex: 0 0 100%;
  width: 100%;

  .os-number-label {
    text-transform: uppercase;
  }
}
@media #{$media-query-small} {
  .admin-stats__item {
    flex: 0 0 50%;
    width: 50%;
  }
}
@media #{$media-query-medium} {
  .admin-stats__item {
    flex: 0 0 33.333%;
    width: 33.333%;
  }
}
</style>
