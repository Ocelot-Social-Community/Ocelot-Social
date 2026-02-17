<template>
  <base-card class="hashtags-filter">
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
  </base-card>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'

export default {
  components: { OsButton, OsIcon },
  props: {
    hashtag: {
      type: String,
      required: true,
    },
  },
  created() {
    this.icons = ocelotIcons
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
