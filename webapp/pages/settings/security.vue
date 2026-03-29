<template>
  <os-card>
    <h2 class="title">{{ $t('settings.security.name') }}</h2>
    <password-form ref="form" require-old-password @submit="handleSubmit" />
  </os-card>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import { useChangePassword } from '~/composables/useChangePassword'
import PasswordForm from '~/components/Password/PasswordForm'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    OsCard,
    PasswordForm,
  },
  created() {
    const { changePassword } = useChangePassword({
      apollo: this.$apollo,
      store: this.$store,
      toast: this.$toast,
      t: this.$t,
    })
    this._changePassword = changePassword
  },
  methods: {
    async handleSubmit(formData) {
      const { success } = await this._changePassword(formData)
      if (success) {
        this.$refs.form.done()
      } else {
        this.$refs.form.fail()
      }
    },
  },
}
</script>
