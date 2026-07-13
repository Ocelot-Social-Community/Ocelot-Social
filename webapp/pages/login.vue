<template>
  <div class="login-page">
    <transition name="fade" appear>
      <login-form @success="handleSuccess" />
    </transition>
  </div>
</template>

<script>
import LoginForm from '~/components/LoginForm/LoginForm.vue'
import { branding } from '@ocelot-social/branding'
import { mapGetters } from 'vuex'

export default {
  layout: branding.login.layout,
  components: {
    LoginForm,
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
  },
  asyncData({ store, redirect }) {
    if (
      store.getters['auth/user'].termsAndConditionsAgreedVersion ===
      branding.termsAndConditions.version
    ) {
      redirect('/')
    }
  },
  methods: {
    async handleSuccess() {
      this.$i18n.set(this.user.locale || 'en')

      try {
        if (this.$route.query.inviteCode) {
          this.$router.push({
            name: 'registration',
            query: this.$route.query,
          })
        } else {
          await this.$router.replace(this.$route.query.path || '/')
        }
      } catch (err) {
        // throw new Error(`Problem handling something: ${err}.`);
        // TODO this is causing trouble - most likely due to double redirect on terms&conditions
      }
    },
  },
}
</script>
