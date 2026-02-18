<template>
  <base-card>
    <template v-if="$apollo.loading">
      <div style="text-align: center; padding: 48px 0">
        <os-spinner size="xl" />
      </div>
    </template>
    <template v-else-if="statistics">
      <ds-space margin="large">
        <ds-flex>
          <ds-flex-item
            v-for="(value, name, index) in filterStatistics(statistics)"
            :key="index"
            :width="{ base: '100%', sm: '50%', md: '33%' }"
          >
            <ds-space margin="small">
              <ds-number :count="0" :label="$t('admin.dashboard.' + name)" size="x-large" uppercase>
                <client-only slot="count">
                  <hc-count-to :end-val="value" />
                </client-only>
              </ds-number>
            </ds-space>
          </ds-flex-item>
        </ds-flex>
      </ds-space>
    </template>
    <template v-else>
      <ds-space centered>
        <ds-space>
          <img :src="errorIconPath" width="40" />
        </ds-space>
        <ds-text>
          {{ $t('site.error-occurred') }}
        </ds-text>
      </ds-space>
    </template>
  </base-card>
</template>

<script>
import { OsSpinner } from '@ocelot-social/ui'
import HcCountTo from '~/components/CountTo.vue'
import { Statistics } from '~/graphql/admin/Statistics'

export default {
  components: {
    OsSpinner,
    HcCountTo,
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
