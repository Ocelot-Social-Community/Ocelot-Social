<template>
  <base-card>
    <h2 class="title">{{ $t('admin.donations.name') }}</h2>
    <ds-form v-model="formData" @submit="submit">
      <ds-text class="show-donations-checkbox">
        <input
          id="showDonations"
          type="checkbox"
          v-model="showDonations"
          :checked="showDonations"
        />
        <label for="showDonations">
          {{ $t('admin.donations.showDonationsCheckboxLabel') }}
        </label>
      </ds-text>
      <ds-input
        class="donations-data"
        model="goal"
        :label="$t('admin.donations.goal')"
        placeholder="15000"
        icon="money"
        :disabled="!showDonations"
        data-test="donations-goal"
      />
      <ds-input
        class="donations-data"
        model="progress"
        :label="$t('admin.donations.progress')"
        placeholder="1200"
        icon="money"
        :disabled="!showDonations"
        data-test="donations-progress"
      />
      <base-button class="donations-info-button" filled type="submit">
        {{ $t('actions.save') }}
      </base-button>
    </ds-form>
  </base-card>
</template>

<script>
import { DonationsQuery, UpdateDonations } from '~/graphql/Donations'

export default {
  data() {
    return {
      formData: {
        goal: null,
        progress: null,
      },
      // TODO: Our styleguide does not support checkmarks.
      // Integrate showDonations into `this.formData` once we
      // have checkmarks available.
      showDonations: null,
    }
  },
  methods: {
    submit() {
      const { showDonations } = this
      const { goal, progress } = this.formData
      this.$apollo
        .mutate({
          mutation: UpdateDonations(),
          variables: {
            showDonations,
            goal: parseInt(goal),
            progress: parseInt(progress),
          },
        })
        .then(() => {
          this.$toast.success(this.$t('admin.donations.successfulUpdate'))
        })
        .catch((error) => this.$toast.error(error.message))
    },
  },
  apollo: {
    Donations: {
      query() {
        return DonationsQuery()
      },
      update({ Donations }) {
        if (!Donations[0]) return
        const { showDonations, goal, progress } = Donations[0]
        this.showDonations = showDonations
        this.formData = {
          goal,
          progress,
        }
      },
    },
  },
}
</script>

<style lang="scss" scoped>
.show-donations-checkbox {
  margin-top: $space-base;
  margin-bottom: $space-small;
}

.donations-data {
  margin-left: $space-small;
}

.donations-info-button {
  margin-top: $space-small;
}
</style>
