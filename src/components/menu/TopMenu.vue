<template>
  <v-app-bar flat>
    <LogoAvatar />
    <v-container class="mx-auto d-flex align-center justify-center">
      <VikeBtn href="/">Home</VikeBtn>
      <VikeBtn href="/app">App</VikeBtn>
      <VikeBtn href="/about">About</VikeBtn>
    </v-container>
  </v-app-bar>
</template>

<script lang="ts" setup>
import VikeBtn from '#components/VikeBtn.vue'

import LogoAvatar from './LogoAvatar.vue'
</script>
