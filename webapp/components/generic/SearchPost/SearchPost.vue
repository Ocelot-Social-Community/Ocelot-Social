<template>
  <section class="search-post">
    <p class="label">{{ option.title | truncate(70) }}</p>
    <div class="metadata">
      <span class="counts">
        <os-counter-icon :icon="icons.comments" :count="option.commentsCount" soft />
        <os-counter-icon :icon="icons.heartO" :count="option.shoutedCount" soft />
        <os-counter-icon :icon="icons.handPointer" :count="option.clickedCount" soft />
        <os-counter-icon :icon="icons.eye" :count="option.viewedTeaserCount" soft />
      </span>
      {{ option.author.name | truncate(32) }} - {{ option.createdAt | dateTime('dd.MM.yyyy') }}
    </div>
  </section>
</template>

<script>
import { OsCounterIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'SearchPost',
  components: {
    OsCounterIcon,
  },
  props: {
    option: { type: Object, required: true },
  },
  created() {
    this.icons = iconRegistry
  },
}
</script>
<style lang="scss">
.search-post {
  display: flex;

  > .label {
    flex-grow: 1;
    padding: 0 $space-x-small;
  }

  > .metadata {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    color: $text-color-softer;
    font-size: $font-size-small;

    > .counts > .os-counter-icon {
      margin: 0 $space-x-small;
    }
  }
}
</style>
