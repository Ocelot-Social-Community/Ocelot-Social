<template>
  <section class="search-group">
    <p class="label">{{ option.groupName | truncate(70) }}</p>
    <div class="metadata"></div>
  </section>
</template>

<script>
export default {
  name: 'SearchGroup',
  props: {
    option: { type: Object, required: true },
  },
}
</script>
<style lang="scss">
.search-group {
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

    > .counts > .counter-icon {
      margin: 0 $space-x-small;
    }
  }
}
</style>
