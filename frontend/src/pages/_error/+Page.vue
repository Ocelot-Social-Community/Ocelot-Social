<template>
  <div v-if="is404">
    <h1>{{ $t('error.404.h1') }}</h1>
    <p>{{ $t('error.404.text') }}</p>
  </div>
  <div v-else>
    <h1>{{ $t('error.500.h1') }}</h1>
    <p>{{ $t('error.500.text') }}</p>
  </div>
</template>

<script lang="ts" setup>
defineProps({ is404: Boolean })
</script>
