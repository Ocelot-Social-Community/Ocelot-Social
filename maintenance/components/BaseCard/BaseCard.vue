<template>
  <article :class="classNames">
    <template v-if="$slots.imageColumn">
      <aside class="image-column">
        <slot name="imageColumn" />
      </aside>
      <section class="content-column">
        <slot />
      </section>
    </template>

    <template v-else-if="$slots.heroImage">
      <section class="hero-image">
        <slot name="heroImage" />
      </section>
      <slot />
    </template>

    <slot v-else />
    <aside v-if="$slots.topMenu" class="top-menu">
      <slot name="topMenu" />
    </aside>
  </article>
</template>

<script>
export default {
  props: {
    highlight: {
      type: Boolean,
      default: false,
    },
    wideContent: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    classNames() {
      let classNames = 'base-card'

      if (this.$slots.imageColumn) classNames += ' --columns'
      if (this.highlight) classNames += ' --highlight'
      if (this.wideContent) classNames += ' --wide-content'

      return classNames
    },
  },
}
</script>

<style>
.base-card {
  position: relative;
  padding: var(--space-base);
  border-radius: var(--border-radius-x-large);
  overflow: hidden;
  overflow-wrap: break-word;
  background-color: var(--color-neutral-100);
  box-shadow: var(--box-shadow-base);

  &.--columns {
    display: flex;
  }

  &.--highlight {
    border: var(--border-size-base) solid var(--color-warning);
  }

  &.--wide-content {
    padding: var(--space-small)

    > .hero-image {
      width: calc(100% + (2 * var(--space-small)));
      margin: calc(-1 * var(--space-small));
      margin-bottom: var(--space-small);
    }
  }

  > .title,
  > .content-column > .title {
    font-size: var(--font-size-large);
    margin-bottom: var(--space-x-small);
  }

  > .hero-image {
    width: calc(100% + (2 * var(--space-base)));
    max-height: var(--size-image-max-height);
    margin: calc(-1 * var(--space-base));
    margin-bottom: var(--space-base);
    overflow: hidden;

    > .image {
      width: 100%;
      object-fit: contain;
    }
  }

  > .image-column {
    flex-basis: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-right: var(--space-base);

    .image {
      width: 100%;
      max-width: 200px;
    }
  }

  > .content-column {
    flex-basis: 50%;
  }

  > .top-menu {
    position: absolute;
    top: var(--space-small);
    left: var(--space-small);
  }
}

@media (max-width: 565px) {
  .base-card.--columns {
    flex-direction: column;

    > .image-column {
      padding-right: 0;
      margin-bottom: var(--space-base);
    }
  }
}
</style>
