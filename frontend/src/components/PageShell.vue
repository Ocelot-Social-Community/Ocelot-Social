<template>
  <v-app>
    <TopMenu />
    <slot />
  </v-app>
</template>

<script lang="ts" setup>
import TopMenu from '#components/menu/TopMenu.vue'
</script>
