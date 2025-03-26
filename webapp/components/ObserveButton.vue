<template>
  <ds-space margin="xx-small" class="text-align-center">
    <base-button :loading="loading" :filled="observed" icon="bell" circle @click="toggle" />
    <ds-space margin-bottom="xx-small" />
    <ds-text color="soft" class="observe-button-text">
      <ds-heading style="display: inline" tag="h3">{{ observedCount }}x</ds-heading>
      {{ $t('observeButton.observed') }}
    </ds-text>
  </ds-space>
</template>

<script>
export default {
  props: {
    count: { type: Number, default: 0 },
    postId: { type: String, default: null },
    isObserved: { type: Boolean, default: false },
  },
  data() {
    return {
      loading: false,
      observedCount: this.count,
      observed: false,
    }
  },
  watch: {
    isObserved: {
      immediate: true,
      handler: function (observed) {
        this.observed = observed
      },
    },
  },
  methods: {
    toggle() {
      this.$emit('toggleObservePost', this.postId, !this.observed)
    },
  },
}
</script>

<style lang="scss">
.observe-button-text {
  user-select: none;
}
.text-align-center {
  text-align: center;
}
</style>
