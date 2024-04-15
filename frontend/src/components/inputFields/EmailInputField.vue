<script lang="ts" setup>
import MailIcon from '#components/icons/MailIcon.vue'

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
    :prepend-inner-icon="MailIcon"
  ></v-text-field>
</template>
