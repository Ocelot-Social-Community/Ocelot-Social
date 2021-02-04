<template>
</template>

<script>
export default {
  name: 'WatchScopedSlotsCallback',
  props: {
    scopedData: { type: Object, required: true },
    changeCallback: { type: Function, required: true },
  },
  data() {
    // Wolle
    return {}
  },
  computed: {
    // Wolle
  },
  watch: {
    scopedData: {
      handler(value) {
        this.changeCallback(value)
      },
      deep: true,
      immediate: true,
    }
  },
  methods: {
    // Wolle
  },
}
</script>

<style lang="scss">
</style>
