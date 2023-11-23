<template>
  <v-btn elevation="2" @click="state.count++">{{
    $t('app.inc.text', { count: state.count })
  }}</v-btn>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'

const state = reactive({ count: 0 })
</script>
