<template>
  <enter-nonce :email="email" @nonceEntered="nonceEntered">
    <div class="ds-mb-xxx-small ds-mt-large ds-space-centered">
      <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
    </div>
  </enter-nonce>
</template>

<script>
import EnterNonce from '~/components/EnterNonce/EnterNonce.vue'

export default {
  components: {
    EnterNonce,
  },
  data() {
    const { email = '' } = this.$route.query
    return { email }
  },
  methods: {
    nonceEntered({ email, nonce }) {
      this.$router.push({ path: 'change-password', query: { email, nonce } })
    },
  },
}
</script>
