<template>
  <ds-space centered margin="xxx-small">
    <ds-space margin-bottom="small" />
    <ds-heading tag="h4">
      {{ $t('contribution.comment.commenting-disabled.no-group-member.reason') }}
      <nuxt-link
        :to="{
          name: 'groups-id-slug',
          params: { slug: group.slug, id: group.id },
        }"
      >
        {{ group.name }}
      </nuxt-link>
    </ds-heading>
    <ds-text>
      {{ $t('contribution.comment.commenting-disabled.no-group-member.call-to-action') }}
    </ds-text>
    <join-leave-button
      :group="group"
      :userId="$store.getters['auth/user'].id"
      :isMember="isGroupMember"
      :isNonePendingMember="isGroupMemberNonePending"
      :filled="true"
      @update="updateJoinLeave"
    />
  </ds-space>
</template>

<script>
import JoinLeaveButton from '~/components/Button/JoinLeaveButton'

export default {
  name: 'CtaJoinLeaveGroup',
  components: {
    JoinLeaveButton,
  },
  props: {
    group: {
      type: Object,
      require: true,
    },
  },
  computed: {
    isGroupMember() {
      return this.group ? !!this.group.myRole : false
    },
    isGroupMemberNonePending() {
      return this.group ? ['usual', 'admin', 'owner'].includes(this.group.myRole) : false
    },
  },
  methods: {
    async updateJoinLeave(data) {
      this.$emit('update', data)
    },
  },
}
</script>

<style lang="scss" scoped>
.join-leave-button {
  width: auto;
  margin: auto !important;
}
</style>
