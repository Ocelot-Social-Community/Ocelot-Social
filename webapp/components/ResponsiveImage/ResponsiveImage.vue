<template>
  <img
    :src="image.url"
    :sizes="sizes"
    :srcset="srcset"
    :class="{ 'responsive-image--loaded': loaded }"
    class="responsive-image"
    :loading="loading"
    fetchpriority="low"
    @load="onLoad"
    @error="onError"
  />
</template>

<script>
export default {
  name: 'ResponsiveImage',
  emits: ['loaded', 'error'],
  props: {
    image: {
      type: Object,
      required: true,
    },
    sizes: {
      type: String,
      required: true,
    },
    loading: {
      // Native <img> lazy loading. Deferring is right for images far down a
      // feed, but wrong wherever the image starts inside a `display: none`
      // subtree (it never gets fetched, and the opacity transition below then
      // leaves an invisible box behind) — those callers pass 'eager'.
      type: String,
      default: 'lazy',
      validator: (value) => /^(lazy|eager)$/.test(value),
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
    onError() {
      // Native error events don't bubble, so a parent listening with @error
      // would never hear about a broken image without this re-emit.
      this.$emit('error')
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
