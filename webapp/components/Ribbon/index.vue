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

<style scoped>
.ribbon {
  padding: var(--size-ribbon) var(--size-ribbon);
  border-radius: var(--border-radius-small) 0 0 var(--border-radius-small);
  color: var(--color-neutral-100);
  background-color: var(--color-ribbon-article);
  font-size: var(--font-size-x-small);
  font-weight: var(--text-weight-bold);

  &::before {
    content: ' ';
    position: absolute;
    right: 0;
    bottom: calc(-1 * var(--size-ribbon));
    border-width: var(--border-size-large) 4px var(--border-size-large) var(--border-size-large);
    border-style: solid;
    border-color: var(--color-ribbon-article-shadow) transparent transparent
      var(--color-ribbon-article-shadow);
  }

  &.--pinned {
    background-color: var(--color-ribbon-announcement);

    &::before {
      border-color: var(--color-ribbon-announcement-shadow) transparent transparent
        var(--color-ribbon-announcement-shadow);
    }
  }
}
.eventBg {
  background-color: var(--color-ribbon-event);

  &::before {
    border-color: var(--color-ribbon-event-shadow) transparent transparent
      var(--color-ribbon-event-shadow);
  }
}
</style>
