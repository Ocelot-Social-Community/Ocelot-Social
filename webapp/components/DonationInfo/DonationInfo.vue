<template>
  <page-params-link :pageParams="links.DONATE" class="donation-info">
    <progress-bar :label="label" :goal="goal" :progress="progress">
      <os-button size="sm" variant="primary">
        {{ $t('donations.donate-now') }}
        <template #suffix>
          <os-icon :icon="icons.heartO" />
        </template>
      </os-button>
    </progress-bar>
  </page-params-link>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import links from '~/constants/links.js'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'
import ProgressBar from '~/components/ProgressBar/ProgressBar.vue'

export default {
  components: {
    OsButton,
    OsIcon,
    PageParamsLink,
    ProgressBar,
  },
  props: {
    title: { type: String, required: false, default: () => null },
    goal: { type: Number, required: true },
    progress: { type: Number, required: true },
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    return {
      links,
    }
  },
  computed: {
    label() {
      return this.$t('donations.amount-of-total', {
        amount: this.progress.toLocaleString(this.$i18n.locale()),
        total: this.goal.toLocaleString(this.$i18n.locale()),
      })
    },
  },
}
</script>

<style lang="scss">
.donation-info {
  display: flex;
  flex: 1;
  margin-bottom: $space-x-small;
  margin-top: 16px;
  cursor: pointer;
}
</style>
