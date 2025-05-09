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
import { validateInviteCodeQuery, redeemInviteCodeMutation } from '~/graphql/inviteCodes'

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
  methods: {
    async handleSuccess() {
      this.$i18n.set(this.user.locale || 'en')

      try {
        if (this.$route.query.inviteCode) {
          const code = this.$route.query.inviteCode
          const result = await this.$apollo.query({
            query: validateInviteCodeQuery,
            variables: { code },
          })
          const {
            data: {
              validateInviteCode: { invitedTo: group },
            },
          } = result
          if (group) {
            const mutationResult = await this.$apollo.mutate({
              mutation: redeemInviteCodeMutation,
              variables: { code },
            })
            if (mutationResult.data.redeemInviteCode && group.groupType === 'public') {
              this.$router.push(`/groups/${group.id}/${group.slug}`)
            } else {
              await this.$router.replace(this.$route.query.path || '/')
            }
          } else {
            await this.$router.replace(this.$route.query.path || '/')
          }
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
