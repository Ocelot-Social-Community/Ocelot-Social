<template>
  <os-button
    data-test="follow-btn"
    :variant="isFollowed && hovered ? 'danger' : 'primary'"
    :appearance="isFollowed && !hovered ? 'filled' : 'outline'"
    :disabled="disabled || !followId"
    :loading="loading"
    full-width
    @mouseenter="onHover"
    @mouseleave="hovered = false"
    @click.prevent="toggle"
  >
    <template #icon>
      <os-icon :icon="icon" />
    </template>
    {{ label }}
  </os-button>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
import { followUserMutation, unfollowUserMutation } from '~/graphql/User'

export default {
  name: 'HcFollowButton',
  components: { OsButton, OsIcon },
  props: {
    followId: { type: String, default: null },
    isFollowed: { type: Boolean, default: false },
  },
  data() {
    return {
      disabled: false,
      loading: false,
      hovered: false,
    }
  },
  computed: {
    icon() {
      if (this.isFollowed && this.hovered) {
        return this.icons.close
      } else {
        return this.isFollowed ? this.icons.check : this.icons.plus
      }
    },
    label() {
      if (this.isFollowed) {
        return this.$t('followButton.following')
      } else {
        return this.$t('followButton.follow')
      }
    },
  },
  watch: {
    isFollowed() {
      this.loading = false
      this.hovered = false
    },
  },
  created() {
    this.icons = ocelotIcons
  },
  methods: {
    onHover() {
      if (!this.disabled && !this.loading) {
        this.hovered = true
      }
    },
    async toggle() {
      const follow = !this.isFollowed
      const mutation = follow ? followUserMutation(this.$i18n) : unfollowUserMutation(this.$i18n)

      this.hovered = false
      const optimisticResult = { followedByCurrentUser: follow }
      this.$emit('optimistic', optimisticResult)

      try {
        const { data } = await this.$apollo.mutate({
          mutation,
          variables: { id: this.followId },
        })

        const followedUser = follow ? data.followUser : data.unfollowUser
        this.$emit('update', followedUser)
      } catch (err) {
        optimisticResult.followedByCurrentUser = !follow
        this.$emit('optimistic', optimisticResult)
      }
    },
  },
}
</script>
