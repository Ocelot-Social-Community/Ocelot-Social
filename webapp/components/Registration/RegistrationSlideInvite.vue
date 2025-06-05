<template>
  <ds-form
    class="enter-invite"
    v-model="formData"
    :schema="formSchema"
    @input="handleInput"
    @input-valid="handleInputValid"
  >
    <ds-input
      :placeholder="formSchema.inviteCode.placeholder"
      :minlength="formSchema.inviteCode.minLength"
      :maxlength="formSchema.inviteCode.maxLength"
      model="inviteCode"
      name="inviteCode"
      id="inviteCode"
      icon="question-circle"
    />
    <ds-text v-if="!validInput">
      {{ $t('components.registration.invite-code.form.description') }}
    </ds-text>
    <div class="invitation-info" v-if="invitedBy">
      <profile-avatar :profile="invitedBy" size="small" />
      <span v-if="invitedTo && invitedTo.groupType === 'hidden'">
        {{
          $t('components.registration.invite-code.invited-to-hidden-group', {
            invitedBy: invitedBy.name,
          })
        }}
      </span>
      <span v-else-if="invitedTo">
        {{
          $t('components.registration.invite-code.invited-by-and-to', {
            invitedBy: invitedBy.name,
            invitedTo: invitedTo.name,
          })
        }}
      </span>
      <span v-else>
        {{ $t('components.registration.invite-code.invited-by', { invitedBy: invitedBy.name }) }}
      </span>
    </div>
    <slot></slot>
    <ds-space margin="xxx-small" />
  </ds-form>
</template>

<script>
import registrationConstants from '~/constants/registrationBranded.js'
import { validateInviteCode } from '~/graphql/InviteCode'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'

export default {
  name: 'RegistrationSlideInvite',
  props: {
    sliderData: { type: Object, required: true },
  },
  components: {
    ProfileAvatar,
  },
  data() {
    return {
      formData: {
        inviteCode: '',
      },
      formSchema: {
        inviteCode: {
          type: 'string',
          min: registrationConstants.INVITE_CODE_LENGTH,
          max: registrationConstants.INVITE_CODE_LENGTH,
          required: true,
          message: this.$t('components.registration.invite-code.form.validations.length', {
            inviteCodeLength: registrationConstants.INVITE_CODE_LENGTH,
          }),
        },
      },
      dbRequestInProgress: false,
    }
  },
  mounted: function () {
    this.formData.inviteCode = this.sliderData.collectedInputData.inviteCode
      ? this.sliderData.collectedInputData.inviteCode
      : ''
    this.sendValidation()

    this.sliderData.setSliderValuesCallback(this.validInput, {
      sliderSettings: { buttonSliderCallback: this.onNextClick },
    })
  },
  computed: {
    sliderIndex() {
      return this.sliderData.sliderIndex // to have a shorter notation
    },
    validInput() {
      return this.formData.inviteCode.length === 6
    },
    invitedBy() {
      return this.validInput &&
        this.sliderData.sliders[this.sliderIndex].data.response.validateInviteCode
        ? this.sliderData.sliders[this.sliderIndex].data.response.validateInviteCode.generatedBy
        : null
    },
    invitedTo() {
      return this.validInput &&
        this.sliderData.sliders[this.sliderIndex].data.response.validateInviteCode
        ? this.sliderData.sliders[this.sliderIndex].data.response.validateInviteCode.invitedTo
        : null
    },
  },
  methods: {
    async sendValidation() {
      const { inviteCode } = this.formData

      this.sliderData.setSliderValuesCallback(null, { collectedInputData: { inviteCode } })

      let dbValidated = false
      if (this.validInput) {
        dbValidated = await this.handleSubmitVerify()
      }
      this.sliderData.setSliderValuesCallback(dbValidated)
    },
    async handleInput() {
      this.sendValidation()
    },
    async handleInputValid() {
      this.sendValidation()
    },
    async handleSubmitVerify() {
      const { inviteCode } = this.sliderData.collectedInputData
      const variables = { code: inviteCode }

      if (!this.dbRequestInProgress) {
        try {
          this.dbRequestInProgress = true

          const response = await this.$apollo.query({ query: validateInviteCode(), variables })
          this.sliderData.setSliderValuesCallback(null, {
            sliderData: {
              request: { variables },
              response: response.data,
            },
          })

          const validationResult = response.data.validateInviteCode

          if (validationResult && validationResult.isValid) {
            this.$toast.success(
              this.$t('components.registration.invite-code.form.validations.success', {
                inviteCode,
              }),
            )
            return true
          } else {
            this.$toast.error(
              this.$t('components.registration.invite-code.form.validations.error', {
                inviteCode,
              }),
            )
            return false
          }
        } catch (err) {
          this.sliderData.setSliderValuesCallback(false, {
            sliderData: { response: { isValidInviteCode: false } },
          })

          const { message } = err
          this.$toast.error(message)
          return false
        } finally {
          this.dbRequestInProgress = false
        }
      }
    },
    onNextClick() {
      return true
    },
  },
}
</script>

<style lang="scss" scoped>
.enter-invite {
  display: flex;
  flex-direction: column;
  margin: $space-large 0 $space-xxx-small 0;
}

.invitation-info {
  display: flex;
  align-items: center;
  margin-bottom: $space-x-small;
  gap: $space-small;

  > * {
    flex-shrink: 0;
  }

  > span {
    flex: auto;
  }
}
</style>
