<template>
  <ds-space margin="xx-small" class="text-align-center">
    <base-button :loading="loading" :filled="isObserved" icon="bell" circle @click="toggle" />
    <ds-space margin-bottom="xx-small" />
    <ds-text color="soft" class="observe-button-text">
      <ds-heading style="display: inline" tag="h3">{{ count }}x</ds-heading>
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
    }
  },
  methods: {
    toggle() {
      this.$emit('toggleObservePost', this.postId, !this.isObserved)
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
