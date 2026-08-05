<template>
  <h5 class="ds-heading ds-heading-h5 ds-heading-soft search-heading">
    {{ $t(`search.heading.${resourceType}`, {}, 2) }}
  </h5>
</template>
<script>
export default {
  name: 'SearchHeading',
  props: {
    resourceType: { type: String, required: true },
  },
}
</script>
<style>
.search-heading.ds-heading {
  margin: calc(-1 * var(--space-x-small));
  padding: var(--space-x-small);
  background-color: var(--color-neutral-100);
  font-weight: var(--text-weight-bold);
  cursor: default;
}

/*  override styleguide styles */
.search-heading.ds-heading:first-child {
  margin-top: calc(-1 * var(--space-x-small));
}
</style>
