<template>
  <v-btn :variant="isRoutSelected($attrs.href as string) ? 'tonal' : 'flat'">
    <slot />
  </v-btn>
</template>
<script lang="ts" setup>
import { usePageContext } from '#context/usePageContext'

const pageContext = usePageContext()

const isRoutSelected = (href: string) => {
  if (href === '/app') {
    return pageContext.urlPathname.indexOf(href) === 0
  }
  return pageContext.urlPathname === href
}
</script>
