<template>
  <v-btn elevation="2" @click="state.count++">{{ $t('counter') }} {{ state.count }}</v-btn>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'

const state = reactive({ count: 0 })
</script>
