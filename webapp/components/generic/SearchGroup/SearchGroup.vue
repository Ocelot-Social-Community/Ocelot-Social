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

<style>
.search-group {
  display: flex;

  > .label {
    flex-grow: 1;
    padding: 0 var(--space-x-small);
  }

  > .metadata {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    color: var(--text-color-softer);
    font-size: var(--font-size-small);
  }
}
</style>
