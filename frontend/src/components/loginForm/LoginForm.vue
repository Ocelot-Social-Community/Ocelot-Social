<script lang="ts" setup>
import { ref } from 'vue'

import EmailInputField from '#components/inputFields/EmailInputField.vue'
import PasswordInputField from '#components/inputFields/PasswordInputField.vue'

const email = ref()
const password = ref()

function submit() {
  alert(`Submitted with email ${email.value} and password ${password.value}`)
}
</script>

<template>
  <v-form @submit.prevent="submit">
    <email-input-field v-model="email" required autofocus placeholder="Your email address" />
    <password-input-field v-model="password" required placeholder="Your password" />
    <button type="submit">{{ $t('login.login') }}</button>
  </v-form>
</template>
