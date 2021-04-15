<template>
  <div class="donation-info">
    <progress-bar :title="computedTitle" :label="label" :goal="goal" :progress="progress">
      <a target="_blank" :href="links.DONATE">
        <base-button size="small" filled>{{ $t('donations.donate-now') }}</base-button>
      </a>
    </progress-bar>
  </div>
</template>

<script>
import links from '~/constants/links.js'
import { DonationsQuery } from '~/graphql/Donations'
import ProgressBar from '~/components/ProgressBar/ProgressBar.vue'

export default {
  components: {
    ProgressBar,
  },
  props: {
    title: { type: String, required: false },
  },
  data() {
    return {
      links,
      goal: 15000,
      progress: 0,
    }
  },
  computed: {
    computedTitle() {
      if (this.title) return this.title
      const today = new Date()
      const month = today.toLocaleString(this.$i18n.locale(), { month: 'long' })
      return `${this.$t('donations.donations-for')} ${month}`
    },
    label() {
      return this.$t('donations.amount-of-total', {
        amount: this.progress.toLocaleString(this.$i18n.locale()),
        total: this.goal.toLocaleString(this.$i18n.locale()),
      })
    },
  },
  apollo: {
    Donations: {
      query() {
        return DonationsQuery()
      },
      update({ Donations }) {
        if (!Donations[0]) return
        const { goal, progress } = Donations[0] // Wolle showDonations
        this.goal = goal
        this.progress = progress
      },
    },
  },
}
</script>

<style lang="scss">
.donation-info {
  // Wolle
  display: flex;
  // align-items: flex-end;
  // width: 100%;
  // height: 100%;
  flex: 1;
  margin-bottom: $space-x-small;

  // @media (max-width: 546px) {
  //   // width: 100%;
  //   height: 50%;
  //   // justify-content: flex-end;
  //   // margin-bottom: $space-x-small;
  // }
}
</style>
