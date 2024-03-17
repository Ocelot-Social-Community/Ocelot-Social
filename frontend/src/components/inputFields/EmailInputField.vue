<script lang="ts" setup>
import MailIcon from '#components/icons/MailIcon.vue'

withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    placeholder?: string
    required?: boolean
    autofocus?: boolean
  }>(),
  {
    label: '',
    placeholder: '',
    required: undefined,
    autofocus: undefined,
  },
)

const email = defineModel<string>()
</script>

<template>
  <v-text-field
    v-model="email"
    variant="outlined"
    type="email"
    :label="$props.label"
    :placeholder="$props.placeholder"
    :required="$props.required"
    :prepend-inner-icon="MailIcon"
    :autofocus="autofocus"
  ></v-text-field>
</template>
