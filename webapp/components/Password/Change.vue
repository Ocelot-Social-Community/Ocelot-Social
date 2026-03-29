<template>
  <password-form ref="form" require-old-password @submit="handleSubmit" />
</template>

<script>
import gql from 'graphql-tag'
import PasswordForm from './PasswordForm'

export default {
  name: 'ChangePassword',
  components: {
    PasswordForm,
  },
  methods: {
    async handleSubmit(formData) {
      const mutation = gql`
        mutation ($oldPassword: String!, $password: String!) {
          changePassword(oldPassword: $oldPassword, newPassword: $password)
        }
      `
      try {
        const { data } = await this.$apollo.mutate({ mutation, variables: formData })
        this.$store.commit('auth/SET_TOKEN', data.changePassword)
        this.$toast.success(this.$t('settings.security.change-password.success'))
        this.$refs.form.done()
      } catch (err) {
        this.$toast.error(err.message)
        this.$refs.form.fail()
      }
    },
  },
}
</script>
