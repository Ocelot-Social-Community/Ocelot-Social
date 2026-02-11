<template>
  <base-card class="hashtags-filter">
    <h2>{{ $t('hashtags-filter.hashtag-search', { hashtag }) }}</h2>
    <os-button
      variant="primary"
      appearance="ghost"
      circle
      :title="this.$t('hashtags-filter.clearSearch')"
      @click="clearSearch"
    >
      <template #icon>
        <base-icon name="close" />
      </template>
    </os-button>
  </base-card>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  components: { OsButton },
  props: {
    hashtag: {
      type: String,
      required: true,
    },
  },
  methods: {
    clearSearch() {
      this.$emit('clearSearch')
    },
  },
}
</script>

<style lang="scss">
.hashtags-filter.base-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-x-small $space-base;
}
</style>
