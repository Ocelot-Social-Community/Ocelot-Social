<template>
  <div class="registration-page">
    <registration-slider
      :registrationType="registrationType.method"
      :activePage="registrationType.activePage"
      :overwriteSliderData="overwriteSliderData"
    />
  </div>
</template>

<script>
import registrationConstants from '~/constants/registrationBranded.js'
import RegistrationSlider from '~/components/Registration/RegistrationSlider'
import { validateInviteCodeQuery, redeemInviteCodeMutation } from '~/graphql/inviteCodes'

export default {
  layout: registrationConstants.LAYOUT,
  name: 'Registration',
  components: {
    RegistrationSlider,
  },
  data() {
    const { method = null, email = null, inviteCode = null, nonce = null } = this.$route.query
    return {
      method,
      overwriteSliderData: {
        collectedInputData: {
          inviteCode,
          email,
          emailSend: !!email,
          nonce,
        },
      },
      publicRegistration: this.$env.PUBLIC_REGISTRATION === true, // for 'false' in .env PUBLIC_REGISTRATION is of type undefined and not(!) boolean false, because of internal handling
      inviteRegistration: this.$env.INVITE_REGISTRATION === true, // for 'false' in .env INVITE_REGISTRATION is of type undefined and not(!) boolean false, because of internal handling
    }
  },
  async asyncData({ store, route, app, redirect }) {
    // http://localhost:3000/registration?method=invite-code&inviteCode=PEY8FN
    if (store.getters['auth/isLoggedIn']) {
      const {
        query: { inviteCode: code },
      } = route
      if (code) {
        const {
          apolloProvider: { defaultClient: client },
        } = app
        try {
          const result = await client.query({
            query: validateInviteCodeQuery,
            variables: { code },
          })
          const {
            data: {
              validateInviteCode: { invitedTo: group },
            },
          } = result
          if (group) {
            const mutationResult = await client.mutate({
              mutation: redeemInviteCodeMutation,
              variables: { code },
            })
            if (mutationResult.data.redeemInviteCode && group.groupType === 'public') {
              redirect(`/groups/${group.id}/${group.slug}`)
            } else {
              redirect('/')
            }
          } else {
            redirect('/')
          }
        } catch (_err) {
          redirect('/')
        }
      } else {
        redirect('/')
      }
    }
  },
  computed: {
    registrationType() {
      if (!this.method) {
        return (
          (this.publicRegistration && { method: 'public-registration', activePage: null }) ||
          (this.inviteRegistration && { method: 'invite-code', activePage: null }) || {
            method: 'no-public-registration',
            activePage: null,
          }
        )
      } else {
        if (
          this.method === 'invite-mail' ||
          (this.method === 'invite-code' && this.inviteRegistration)
        ) {
          if (
            this.method === 'invite-code' &&
            this.overwriteSliderData.collectedInputData.inviteCode &&
            this.overwriteSliderData.collectedInputData.nonce &&
            this.overwriteSliderData.collectedInputData.email
          ) {
            return { method: this.method, activePage: 'enter-nonce' }
          }
          return { method: this.method, activePage: null }
        }
        return {
          method: this.publicRegistration ? 'public-registration' : 'no-public-registration',
          activePage: null,
        }
      }
    },
  },
}
</script>
