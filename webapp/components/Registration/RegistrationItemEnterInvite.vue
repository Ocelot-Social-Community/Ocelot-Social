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
  },
  data() {
    return {
      formData: {
        inviteCode: '',
      },
      formSchema: {
        inviteCode: {
          type: 'string',
          min: 6,
          max: 6,
          required: true,
          message: this.$t('components.enter-invite.form.validations.length'),
        },
      },
    }
  },
  mounted: function () {
    this.$nextTick(function () {
      // Code that will run only after the entire view has been rendered
      // console.log('mounted !!! ')
      this.formData.inviteCode = this.sliderData.collectedInputData.inviteCode
        ? this.sliderData.collectedInputData.inviteCode
        : ''
    })
  },
  methods: {
    async handleInput() {
      // Wolle console.log('handleInput !!!')
      this.sliderData.validateCallback(false)
    },
    async handleInputValid() {
      // Wolle console.log('handleInputValid !!!')
      const { inviteCode } = this.formData
      // validate in backend
      // toaster
      this.sliderData.validateCallback(true, { /* email, */ inviteCode })
    },
    handleSubmitVerify() {
      // Wolle const { nonce } = this.formData
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
