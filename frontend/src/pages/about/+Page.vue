<template>
  <DefaultLayout>
    <h1>{{ $t('about.h1') }}</h1>
    <i18n-t scope="global" keypath="about.text1" tag="p">
      <template #link>
        <a href="https://github.com/IT4Change/boilerplate-frontend/" target="_blank">
          {{ $t('about.link1') }}
        </a>
      </template>
    </i18n-t>
    <br />
    <i18n-t scope="global" keypath="about.text2" tag="p">
      <template #link>
        <a href="https://it4c.dev" target="_blank">{{ $t('about.link2') }}</a>
      </template>
    </i18n-t>
  </DefaultLayout>
</template>

<script lang="ts" setup>
import DefaultLayout from '#layouts/DefaultLayout.vue'
</script>
