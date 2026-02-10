<template>
  <div class="donation-info">
    <progress-bar :label="label" :goal="goal" :progress="progress">
      <os-button size="sm" variant="primary" @click="redirectToPage(links.DONATE)">
        {{ $t('donations.donate-now') }}
      </os-button>
    </progress-bar>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import links from '~/constants/links.js'
import ProgressBar from '~/components/ProgressBar/ProgressBar.vue'

export default {
  components: {
    OsButton,
    ProgressBar,
  },
  props: {
    title: { type: String, required: false, default: () => null },
    goal: { type: Number, required: true },
    progress: { type: Number, required: true },
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
  methods: {
    redirectToPage(pageParams) {
      pageParams.redirectToPage(this)
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
}
</style>
