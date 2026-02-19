<template>
  <os-card>
    <transition name="ds-transition-fade">
      <client-only>
        <sweetalert-icon :icon="sweetAlertIcon" />
      </client-only>
    </transition>
    <div v-if="success" class="ds-mb-large">
      <p class="ds-text ds-text-bold ds-text-center">
        {{ $t(`settings.email.change-successful`) }}
      </p>
    </div>
    <template v-else>
      <p class="ds-text ds-text-bold ds-text-center">
        {{ $t(`settings.email.verification-error.message`) }}
      </p>
      <div class="ds-mb-large message">
        <client-only>
          <div class="ds-text">
            <div class="ds-mt-large ds-mb-small">
              {{ $t(`settings.email.verification-error.explanation`) }}
            </div>
            <ul class="ds-list">
              <li class="ds-list-item">
                {{ $t(`settings.email.verification-error.reason.invalid-nonce`) }}
              </li>
              <li class="ds-list-item">
                {{ $t(`settings.email.verification-error.reason.no-email-request`) }}
              </li>
            </ul>
            {{ $t('settings.email.verification-error.support') }}
            <a :href="'mailto:' + supportEmail">{{ supportEmail }}</a>
          </div>
        </client-only>
      </div>
    </template>
  </os-card>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import emails from '~/constants/emails.js'
import { VerifyEmailAddressMutation } from '~/graphql/EmailAddress.js'
import { SweetalertIcon } from 'vue-sweetalert-icons'

export default {
  components: {
    OsCard,
    SweetalertIcon,
  },
  computed: {
    sweetAlertIcon() {
      return this.success ? 'success' : 'error'
    },
  },
  created() {
    if (this.success) {
      setTimeout(() => {
        this.$router.replace({ name: 'settings-my-email-address' })
      }, 3000)
    }
  },
  data() {
    return {
      supportEmail: emails.SUPPORT_EMAIL,
    }
  },
  async asyncData(context) {
    const {
      store,
      query,
      app: { apolloProvider },
    } = context
    const client = apolloProvider.defaultClient
    let success
    const { email = '', nonce = '' } = query
    const currentUser = store.getters['auth/user']

    try {
      const response = await client.mutate({
        mutation: VerifyEmailAddressMutation,
        variables: { email, nonce },
      })
      const {
        data: { VerifyEmailAddress },
      } = response
      success = true
      store.commit(
        'auth/SET_USER',
        { ...currentUser, email: VerifyEmailAddress.email },
        { root: true },
      )
    } catch (error) {
      success = false
    }

    return { success }
  },
}
</script>

<style lang="scss" scoped>
.message {
  display: flex;
  justify-content: space-around;
}
</style>
