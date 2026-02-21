<template>
  <div :style="{ gridRowEnd: 'span ' + rowSpan }">
    <slot></slot>
  </div>
</template>

<script>
const landscapeRatio = 1.3
const squareRatio = 1
const portraitRatio = 0.7
const getRowSpan = (aspectRatio) => {
  if (aspectRatio >= landscapeRatio) return 114
  else if (aspectRatio >= squareRatio) return 132
  else if (aspectRatio >= portraitRatio) return 159
  else return 222
}

export default {
  props: {
    imageAspectRatio: {
      type: Number,
      default: null,
    },
  },
  data() {
    return {
      rowSpan: this.imageAspectRatio ? getRowSpan(this.imageAspectRatio) : 69,
    }
  },
}
</script>
