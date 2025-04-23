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
  background-color: $color-ribbon-article;
  font-size: $font-size-x-small;
  font-weight: $font-weight-bold;

  &::before {
    content: ' ';
    position: absolute;
    right: 0;
    bottom: -$size-ribbon;
    border-width: $border-size-large 4px $border-size-large $border-size-large;
    border-style: solid;
    border-color: $color-ribbon-article-shadow transparent transparent $color-ribbon-article-shadow;
  }

  &.--pinned {
    background-color: $color-ribbon-announcement;

    &::before {
      border-color: $color-ribbon-announcement-shadow transparent transparent
        $color-ribbon-announcement-shadow;
    }
  }
}
.eventBg {
  background-color: $color-ribbon-event;

  &::before {
    border-color: $color-ribbon-event-shadow transparent transparent $color-ribbon-event-shadow;
  }
}
</style>
