<template>
  <request @handleSubmitted="handlePasswordResetRequested"></request>
</template>

<script>
import Request from '~/components/PasswordReset/Request'

export default {
  components: {
    Request,
  },
  methods: {
    handlePasswordResetRequested({ email }) {
      this.$router.push({ path: 'enter-nonce', query: { email } })
    },
  },
}
</script>
