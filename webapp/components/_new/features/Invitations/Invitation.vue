<template>
  <li class="invitation">
    <span v-if="inviteCode.comment">
      {{ inviteCode.comment }}
    </span>
    {{ inviteCode.code }}
    <base-button
      class="copy-button"
      icon="copy"
      @click="copyInviteCode(inviteCode.code)"
      :disabled="!canCopy"
    />
    <base-button
      class="invalidate-button"
      icon="trash"
      @click="$emit('invalidate-invite-code', inviteCode.code)"
    />
  </li>
</template>

<script>
import BaseButton from '~/components/_new/generic/BaseButton/BaseButton.vue'

export default {
  name: 'Invitation',
  components: {
    BaseButton,
  },
  props: {
    inviteCode: {
      type: Object,
      required: true,
    },
  },
  computed: {
    inviteLink() {
      return `${window.location.origin}/registration?method=invite-code&inviteCode=${this.inviteCode.code}`
    },
  },
  data() {
    return {
      canCopy: false,
    }
  },
  created() {
    this.canCopy = !!navigator.clipboard
  },
  methods: {
    async copyInviteCode(code) {
      await navigator.clipboard.writeText(this.inviteLink)
      this.$toast.success(this.$t('invite-codes.copy-success'))
    },
  },
}
</script>
