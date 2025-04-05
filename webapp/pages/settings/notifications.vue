<template>
  <base-card>
    <h2 class="title">{{ $t('settings.notifications.name') }}</h2>
    <ds-space margin-bottom="small" v-for="topic in topics" :key="topic.id">
      <input :id="topic.id" type="checkbox" v-model="emailNotificationSettings[topic.id]" />
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
      emailNotificationSettings: {
        commentOnObservedPost: true,
        postByFollowedUser: true,
        postInGroup: true,
        groupMemberJoined: true,
        groupMemberLeft: true,
        groupMemberRemoved: true,
        groupMemberRoleChanged: true,
      },
      topics: [
        {
          id: 'commentOnObservedPost',
          name: this.$t('settings.notifications.commentOnObservedPost'),
        },
        { id: 'postByFollowedUser', name: this.$t('settings.notifications.postByFollowedUser') },
        { id: 'postInGroup', name: this.$t('settings.notifications.postInGroup') },
        { id: 'groupMemberRemoved', name: this.$t('settings.notifications.groupMemberRemoved') },
        {
          id: 'groupMemberRoleChanged',
          name: this.$t('settings.notifications.groupMemberRoleChanged'),
        },
        { id: 'groupMemberJoined', name: this.$t('settings.notifications.groupMemberJoined') },
        { id: 'groupMemberLeft', name: this.$t('settings.notifications.groupMemberLeft') },
      ],
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    disabled() {
      return this.emailNotificationSettings.every(
        (value, index) => value === this.currentUser.emailNotificationSettings[index],
      )
    },
  },
  created() {
    this.emailNotificationSettings = { ...this.currentUser.emailNotificationSettings }
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    setAll(value) {
      for (const key of Object.keys(this.emailNotificationSettings)) {
        this.emailNotificationSettings[key] = value
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
            emailNotificationSettings: this.emailNotificationSettings,
          },
          update: (_, { data: { UpdateUser } }) => {
            const { emailNotificationSettings } = UpdateUser
            this.setCurrentUser({
              ...this.currentUser,
              emailNotificationSettings,
            })
            this.$toast.success(this.$t('settings.notifications.success-update'))
          },
        })
      } catch (error) {
        this.emailNotificationSettings = !this.emailNotificationSettings
        this.$toast.error(error.message)
      }
    },
  },
}
</script>
