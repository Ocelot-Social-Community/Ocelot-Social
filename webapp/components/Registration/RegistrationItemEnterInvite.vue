<template>
  <ds-form
    class="enter-invite"
    v-model="formData"
    :schema="formSchema"
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
import gql from 'graphql-tag'

export const isValidInviteCodeQuery = gql`
  query($code: ID!) {
    isValidInviteCode(code: $code)
  }
`
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
          // Wolle min: 6,
          // max: 6,
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

      this.sliderData.setSliderValuesCallback(this.validInput, {
        sliderSettings: { buttonSliderCallback: this.onNextClick },
      })
    })
  },
  computed: {
    sliderIndex() {
      return this.sliderData.sliderIndex
    },
    validInput() {
      return this.formData.inviteCode.length === 6
    },
  },
  methods: {
    async sendValidation() {
      const { inviteCode } = this.formData
      const values = { inviteCode }

      let validated = false
      if (this.validInput) {
        await this.handleSubmitVerify()
        validated = this.sliderData.sliders[this.sliderIndex].data.response.isValidInviteCode
      }
      this.sliderData.setSliderValuesCallback(validated, { collectedInputData: values })
    },
    async handleInput() {
      this.sendValidation()
    },
    async handleInputValid() {
      this.sendValidation()
    },
    async handleSubmitVerify() {
      const { inviteCode } = this.formData
      const variables = { code: inviteCode }

      if (
        !this.sliderData.sliders[this.sliderIndex].data.request ||
        (this.sliderData.sliders[this.sliderIndex].data.request &&
          (!this.sliderData.sliders[this.sliderIndex].data.request.variables ||
            (this.sliderData.sliders[this.sliderIndex].data.request.variables &&
              !this.sliderData.sliders[this.sliderIndex].data.request.variables === variables)))
      ) {
        this.sliderData.setSliderValuesCallback(
          this.sliderData.sliders[this.sliderIndex].validated,
          { sliderData: { request: { variables }, response: null } },
        )

        try {
          const response = await this.$apollo.query({ query: isValidInviteCodeQuery, variables })
          this.sliderData.setSliderValuesCallback(
            this.sliderData.sliders[this.sliderIndex].validated,
            { sliderData: { response: response.data } },
          )

          if (
            this.sliderData.sliders[this.sliderIndex].data.response &&
            this.sliderData.sliders[this.sliderIndex].data.response.isValidInviteCode
          ) {
            this.$toast.success(
              this.$t('components.registration.invite-code.form.success', { inviteCode }),
            )
          }
        } catch (err) {
          this.sliderData.setSliderValuesCallback(
            this.sliderData.sliders[this.sliderIndex].validated,
            { sliderData: { response: { isValidInviteCode: false } } },
          )

          const { message } = err
          this.$toast.error(message)
        }
      }
    },
    onNextClick() {
      return true
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
