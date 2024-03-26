<script lang="ts" setup>
import { InputHTMLAttributes } from 'vue'

import MailIcon from '#components/icons/MailIcon.vue'

interface Props extends /* @vue-ignore */ InputHTMLAttributes {
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
