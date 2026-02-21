<template>
  <img
    :src="image.url"
    :sizes="sizes"
    :srcset="srcset"
    :class="{ 'responsive-image--loaded': loaded }"
    class="responsive-image"
    loading="lazy"
    fetchpriority="low"
    @load="onLoad"
  />
</template>

<script>
export default {
  name: 'ResponsiveImage',
  emits: ['loaded'],
  props: {
    image: {
      type: Object,
      required: true,
    },
    sizes: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      loaded: false,
    }
  },
  computed: {
    srcset() {
      const { w320, w640, w1024 } = this.image
      return `${w320} 320w, ${w640} 640w, ${w1024} 1024w`
    },
  },
  mounted() {
    if (this.$el.complete && this.$el.naturalWidth > 0) this.onLoad()
  },
  methods: {
    onLoad() {
      this.loaded = true
      this.$emit('loaded')
    },
  },
}
</script>

<style lang="scss" scoped>
.responsive-image {
  opacity: 0;
  transition: opacity 0.3s ease;

  &--loaded {
    opacity: 1;
  }
}
</style>
