<template>
  <div class="registration-page">
    <!--
      Keyed on the registration method so a live policy change (admin toggling
      publicRegistration / inviteRegistration) remounts the slider: it derives
      its slide set once in data() from registrationType, so without a fresh
      mount the form would stay frozen on the previous mode. A mode switch is
      exactly when resetting any in-progress input is the correct behaviour.
    -->
    <registration-slider
      :key="registrationType.method"
      :registrationType="registrationType.method"
      :activePage="registrationType.activePage"
      :overwriteSliderData="overwriteSliderData"
    />
  </div>
</template>

<script>
import { branding } from '@ocelot-social/branding'
import RegistrationSlider from '~/components/Registration/RegistrationSlider'
import { validateInviteCodeQuery, redeemInviteCodeMutation } from '~/graphql/inviteCodes'

export default {
  layout: branding.registration.layout,
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
              redirect(`/groups/${encodeURIComponent(group.id)}/${encodeURIComponent(group.slug)}`)
              return
            }
          }
        } catch (_err) {
          redirect('/')
          return
        }
      }
      redirect('/')
    }
  },
  computed: {
    publicRegistration() {
      return this.$policy.get('publicRegistration') === true
    },
    inviteRegistration() {
      return this.$policy.get('inviteRegistration') === true
    },
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
