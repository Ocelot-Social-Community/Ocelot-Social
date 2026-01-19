<template>
  <img :src="image.url" :sizes="sizes" :srcset="srcset" />
</template>

<script>
export default {
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
  computed: {
    srcset() {
      const { w320, w640, w1024 } = this.image
      return `${w320} 320w, ${w640} 640w, ${w1024} 1024w`
    },
  },
}
</script>
