<template>
  <ds-text>
    {{ $t('components.registration.email-display.yourEmail') }}
    <b v-if="emailAsString.length > 0">
      {{ emailAsString }}
      <b v-if="!isEmailFormat" class="email-warning">
        {{ $t('components.registration.email-display.warningFormat') }}
      </b>
    </b>
    <b v-else class="email-warning">
      {{ $t('components.registration.email-display.warningUndef') }}
    </b>
  </ds-text>
</template>

<script>
import { isEmail } from 'validator'

export default {
  name: 'EmailDisplayAndVerify',
  props: {
    email: { type: String, default: () => '' },
  },
  computed: {
    isEmailFormat() {
      return isEmail(this.email)
    },
    emailAsString() {
      return !this.email ? '' : this.email
    },
  },
}
</script>

<style lang="scss">
.email-warning {
  color: $text-color-danger;
}
</style>
