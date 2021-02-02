<template>
  <ds-form
    class="enter-invite"
    v-model="formData"
    :schema="formSchema"
    @submit="handleSubmitVerify"
    @input="handleInput"
    @input-valid="handleInputValid"
  >
    <ds-input
      :placeholder="$t('components.enter-invite.form.invite-code')"
      model="inviteCode"
      name="inviteCode"
      id="inviteCode"
      icon="question-circle"
    />
    <ds-text>
      {{ $t('components.enter-invite.form.description') }}
    </ds-text>
    <slot></slot>
  </ds-form>
</template>

<script>
export default {
  name: 'RegistrationItemEnterInvite',
  props: {
    sliderData: { type: Object, required: true },
    inviteCode: { type: String, required: false },
  },
  data() {
    return {
      formData: {
        inviteCode: this.inviteCode ? this.inviteCode : '',
      },
      formSchema: {
        inviteCode: {
          type: 'string',
          min: 5,
          max: 5,
          required: true,
          message: this.$t('components.enter-invite.form.validations.length'),
        },
      },
    }
  },
  methods: {
    async handleInput() {
      // Wolle console.log('handleInput !!!')
      this.sliderData.validateCallback(false)
    },
    async handleInputValid() {
      // Wolle console.log('handleInputValid !!!')
      const { inviteCode } = this.formData
      this.sliderData.validateCallback(true, { /* email, */inviteCode })
    },
    handleSubmitVerify() {
      // Wolle const { nonce } = this.formData
      // const email = this.email
      // this.$emit('nonceEntered', { email, nonce })
      // this.$emit('validation', { email, nonce })
    },
  },
}
</script>

<style lang="scss">
.enter-invite {
  display: flex;
  flex-direction: column;
  margin: $space-large 0 $space-xxx-small 0;
}
</style>
