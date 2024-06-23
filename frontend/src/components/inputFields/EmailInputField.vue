<script lang="ts" setup>
interface Props {
  modelValue: string
}

withDefaults(defineProps<Props>(), {})

const email = defineModel<string>()
</script>

<template>
  <v-text-field
    v-model="email"
    variant="outlined"
    type="email"
    prepend-inner-icon="$envelope"
  ></v-text-field>
</template>
