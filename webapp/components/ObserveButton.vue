<template>
  <action-button
    :loading="false"
    :count="count"
    :text="$t('observeButton.observed')"
    :filled="isObserved"
    :icon="icons.bell"
    circle
    @click="toggle"
  />
</template>

<script>
import { iconRegistry } from '~/utils/iconRegistry'
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
  created() {
    this.icons = iconRegistry
  },
  methods: {
    toggle() {
      this.$emit('toggleObservePost', this.postId, !this.isObserved)
    },
  },
}
</script>
