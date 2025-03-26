<template>
  <base-card>
    <h2 class="title">{{ $t('settings.notifications.name') }}</h2>
    <ds-space margin-bottom="small" v-for="topic in topics" :key="topic.id">
      <input :id="topic.id" type="checkbox" v-model="notifyByEmail[topic.id]" />
      <label :for="topic.id">{{ topic.name }}</label>
    </ds-space>
    <base-button @click="activateAll">
      {{ $t('settings.notifications.activateAll') }}
    </base-button>
    <base-button @click="deactivateAll">
      {{ $t('settings.notifications.deactivateAll') }}
    </base-button>
    <base-button class="save-button" filled @click="submit" :disabled="disabled">
      {{ $t('actions.save') }}
    </base-button>
  </base-card>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import { updateUserMutation } from '~/graphql/User'

export default {
  data() {
    return {
      notifyByEmail: {
        posts: false,
        comments: false,
      },
      topics: [
        { id: 'posts', name: this.$t('settings.notifications.posts') },
        { id: 'comments', name: this.$t('settings.notifications.comments') },
      ],
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    disabled() {
      return this.notifyByEmail === this.currentUser.sendNotificationEmails
    },
  },
  created() {
    this.notifyByEmail = {
      posts: this.currentUser.sendNotificationEmails || false,
      comments: this.currentUser.sendNotificationEmails || false,
    }
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    setAll(value) {
      for (const key of Object.keys(this.notifyByEmail)) {
        this.notifyByEmail[key] = value
      }
    },
    activateAll() {
      this.setAll(true)
    },
    deactivateAll() {
      this.setAll(false)
    },
    async submit() {
      try {
        await this.$apollo.mutate({
          mutation: updateUserMutation(),
          variables: {
            id: this.currentUser.id,
            sendNotificationEmails: this.notifyByEmail,
          },
          update: (_, { data: { UpdateUser } }) => {
            const { sendNotificationEmails } = UpdateUser
            this.setCurrentUser({
              ...this.currentUser,
              sendNotificationEmails,
            })
            this.$toast.success(this.$t('settings.notifications.success-update'))
          },
        })
      } catch (error) {
        this.notifyByEmail = !this.notifyByEmail
        this.$toast.error(error.message)
      }
    },
  },
}
</script>
