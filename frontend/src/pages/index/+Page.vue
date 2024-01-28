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
  </DefaultLayout>
</template>

<script lang="ts" setup>
import DefaultLayout from '#layouts/DefaultLayout.vue'
</script>
