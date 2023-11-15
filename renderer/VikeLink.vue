<template>
  <a :class="{ active: pageContext.urlPathname === $attrs.href }">
    <slot />
  </a>
</template>
<script lang="ts" setup>
import { usePageContext } from './usePageContext'
const pageContext = usePageContext()
</script>
<style scoped>
a {
  padding: 3px 10px;
}
a.active {
  background-color: #eee;
}
</style>
