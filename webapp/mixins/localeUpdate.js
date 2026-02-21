import { mapGetters, mapMutations } from 'vuex'
import { updateUserMutation } from '~/graphql/User.js'

export default {
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    async updateUserLocale() {
      if (!this.currentUser || !this.currentUser.id) return
      try {
        await this.$apollo.mutate({
          mutation: updateUserMutation(),
          variables: {
            id: this.currentUser.id,
            locale: this.$i18n.locale(),
          },
          update: (store, { data: { UpdateUser } }) => {
            this.setCurrentUser({
              ...this.currentUser,
              locale: UpdateUser.locale,
            })
          },
        })
        this.$toast.success(this.$t('contribution.success'))
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
  },
}
