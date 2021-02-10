<template>
  <ds-form
    class="enter-invite"
    v-model="formData"
    :schema="formSchema"
    @input="handleInput"
    @input-valid="handleInputValid"
    @submit="handleSubmitVerify"
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
      this.formData.inviteCode = this.sliderData.collectedInputData.inviteCode
        ? this.sliderData.collectedInputData.inviteCode
        : ''
      this.sendValidation()
    })
  },
  computed: {
    valid() {
      const isValid = this.formData.inviteCode.length === 6
      return isValid
    },
  },
  methods: {
    sendValidation() {
      const { inviteCode } = this.formData
      const value = {
        inviteCode,
      }
      // validate in backend
      // toaster
      this.sliderData.validateCallback(this.valid, value)
    },
    async handleInput() {
      this.sendValidation()
    },
    async handleInputValid() {
      this.sendValidation()
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
