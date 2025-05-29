<template>
  <v-btn
    :variant="isRouteSelected($attrs.href as string) ? 'tonal' : 'flat'"
    @click.prevent="onClick($attrs.href as string)"
  >
    <slot />
  </v-btn>
</template>
<script lang="ts" setup>
import { navigate } from 'vike/client/router'

import { usePageContext } from '#context/usePageContext'

const pageContext = usePageContext()

function onClick(href: string) {
  return navigate(href)
}

const isRouteSelected = (href: string) => {
  if (href === '/app') {
    return pageContext.urlPathname.indexOf(href) === 0
  }
  return pageContext.urlPathname === href
}
</script>
