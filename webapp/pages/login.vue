<template>
  <div class="login-page">
    <transition name="fade" appear>
      <login-form @success="handleSuccess" />
    </transition>
  </div>
</template>

<script>
import LoginForm from '~/components/LoginForm/LoginForm.vue'
import loginConstants from '~/constants/loginBranded.js'
import { VERSION } from '~/constants/terms-and-conditions-version.js'
import { mapGetters } from 'vuex'

export default {
  layout: loginConstants.LAYOUT,
  components: {
    LoginForm,
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
  },
  asyncData({ store, redirect }) {
    if (store.getters['auth/user'].termsAndConditionsAgreedVersion === VERSION) {
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

<style lang="scss">
.login-page {
  width: auto;
  height: auto;
}
</style>
