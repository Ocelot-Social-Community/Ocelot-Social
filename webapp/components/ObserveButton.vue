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
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
import ActionButton from '~/components/ActionButton.vue'

export default {
  components: {
    ActionButton,
  },
  created() {
    this.icons = ocelotIcons
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
