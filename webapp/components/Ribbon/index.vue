<template>
  <aside class="ribbon" :class="typ === 'Event' ? 'eventBg' : ''">
    <p>{{ text }}</p>
  </aside>
</template>

<script>
export default {
  name: 'HcRibbon',
  props: {
    text: {
      type: String,
      default: '',
    },
    typ: {
      type: String,
      default: 'blue',
    },
  },
}
</script>

<style scoped lang="scss">
.ribbon {
  padding: $size-ribbon $size-ribbon;
  border-radius: $border-radius-small 0 0 $border-radius-small;
  color: $color-neutral-100;
  background-color: $color-ribbon-article-active;
  font-size: $font-size-x-small;
  font-weight: $font-weight-bold;

  &::before {
    content: ' ';
    position: absolute;
    right: 0;
    bottom: -$size-ribbon;
    border-width: $border-size-large 4px $border-size-large $border-size-large;
    border-style: solid;
    border-color: $color-ribbon-article transparent transparent $color-ribbon-article;
  }

  &.--pinned {
    background-color: $color-warning;

    &::before {
      border-color: $color-warning transparent transparent $color-warning;
    }
  }
}
.eventBg {
  background-color: $color-ribbon-event-active;

  &::before {
    border-color: $color-ribbon-event transparent transparent $color-ribbon-event;
  }
}
</style>
