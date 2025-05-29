<!-- .storybook/StoryWrapper.vue -->
<template>
  <v-app :theme="themeName">
    <v-main>
      <slot name="story"></slot>
    </v-main>
  </v-app>
</template>

<script>
export const DEFAULT_THEME = 'light'
export default {
  props: {
    themeName: {
      default: DEFAULT_THEME,
      type: String,
    },
  },
}
</script>

<style>
.v-application .v-application__wrap {
  min-height: unset;
}
</style>
