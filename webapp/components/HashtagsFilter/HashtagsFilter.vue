<template>
  <os-card class="hashtags-filter">
    <h2>{{ $t('hashtags-filter.hashtag-search', { hashtag }) }}</h2>
    <os-button
      data-test="clear-search-button"
      variant="primary"
      appearance="ghost"
      circle
      :title="$t('hashtags-filter.clearSearch')"
      :aria-label="$t('hashtags-filter.clearSearch')"
      @click="clearSearch"
    >
      <template #icon>
        <os-icon :icon="icons.close" />
      </template>
    </os-button>
  </os-card>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  components: { OsButton, OsCard, OsIcon },
  props: {
    hashtag: {
      type: String,
      required: true,
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    clearSearch() {
      this.$emit('clearSearch')
    },
  },
}
</script>

<style lang="scss">
.hashtags-filter.os-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-x-small $space-base !important;
}
</style>
