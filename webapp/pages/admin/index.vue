<template>
  <base-card>
    <ApolloQuery :query="Statistics">
      <template v-slot="{ result: { loading, error, data } }">
        <template v-if="loading">
          <ds-space centered>
            <ds-spinner size="large"></ds-spinner>
          </ds-space>
        </template>
        <template v-else-if="error">
          <ds-space centered>
            <ds-space>
              <img :src="errorIconPath" width="40" />
            </ds-space>
            <ds-text>
              {{ $t('site.error-occurred') }}
            </ds-text>
          </ds-space>
        </template>
        <template v-else-if="data">
          <ds-space margin="large">
            <ds-flex>
              <ds-flex-item
                v-for="(value, name, index) in filterStatistics(data.statistics)"
                :key="index"
                :width="{ base: '100%', sm: '50%', md: '33%' }"
              >
                <ds-space margin="small">
                  <ds-number
                    :count="0"
                    :label="$t('admin.dashboard.' + name)"
                    size="x-large"
                    uppercase
                  >
                    <client-only slot="count">
                      <hc-count-to :end-val="value" />
                    </client-only>
                  </ds-number>
                </ds-space>
              </ds-flex-item>
            </ds-flex>
          </ds-space>
        </template>
      </template>
    </ApolloQuery>
  </base-card>
</template>

<script>
import HcCountTo from '~/components/CountTo.vue'
import { Statistics } from '~/graphql/admin/Statistics'

export default {
  components: {
    HcCountTo,
  },
  data() {
    return {
      errorIconPath: '/img/svg/emoji/cry.svg',
      Statistics,
    }
  },
  methods: {
    filterStatistics(data) {
      delete data.__typename
      return data
    },
  },
}
</script>
