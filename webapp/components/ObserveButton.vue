<template>
  <action-button
    :loading="false"
    :disabled="disabled"
    :filled="isObserved"
    :count="count"
    :text="$t('observeButton.observed')"
    icon="bell"
    circle
    @click="toggle"
  />
</template>

<script>
import ActionButton from '~/components/ActionButton.vue'

export default {
  components: {
    ActionButton,
  },
  props: {
    count: { type: Number, default: 0 },
    postId: { type: String, default: null },
    isObserved: { type: Boolean, default: false },
  },
  methods: {
    toggle() {
      this.$emit('toggleObservePost', this.postId, !this.isObserved)
    },
  },
}
</script>
