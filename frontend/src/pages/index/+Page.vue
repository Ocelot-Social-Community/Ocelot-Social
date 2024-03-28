<template>
  <DefaultLayout>
    <h1>{{ $t('home.h1') }}</h1>
    <p>{{ $t('home.text1') }}</p>
    <br />
    <p>{{ $t('home.text2') }}</p>
    <br />
    <p>{{ $t('home.text3') }}</p>
    <br />
    <p>{{ $t('home.text4') }} <v-icon icon="mdi-heart" color="red" /></p>
    <br />
    <p>{{ $t('home.greet1') }}</p>
    <p>{{ $t('home.greet2') }}</p>
    <v-icon icon="mdi-heart" color="primary" />
    <v-icon icon="mdi-heart" color="primary-darken-1" />
    <v-icon icon="mdi-heart" color="secondary" />
    <v-icon icon="mdi-heart" color="error" />
    <v-icon icon="mdi-heart" :color="$vuetify.theme.themes.dark.colors.primary" />
    <!-- <v-icon icon="mdi-heart" :color="$vuetify.theme.themes.dark.variables['theme-kbd']" /> -->
    <v-icon icon="mdi-heart" />
  </DefaultLayout>
</template>

<script lang="ts" setup>
import DefaultLayout from '#layouts/DefaultLayout.vue'
</script>

<style lang="scss">
.icon-color {
  color: var(--v-theme-primary);
}
</style>
