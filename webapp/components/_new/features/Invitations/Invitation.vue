<template>
  <li class="invitation">
    <div class="row1">
      <div class="code">
        {{ inviteCode.code }}
        <span v-if="inviteCode.comment" class="comment">&nbsp;({{ inviteCode.comment }})</span>
      </div>
      <div class="actions">
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
      </div>
    </div>
    <div class="row2">
      <span v-if="inviteCode.redeemedCount === 0">
        {{ $t('invite-codes.invite-code.redeemed-count-0') }}
      </span>
      <span v-else>
        {{ $t('invite-codes.invite-code.redeemed-count', { count: inviteCode.redeemedCount }) }}
      </span>
    </div>
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

<style scoped lang="scss">
.invitation {
  display: flex;
  flex-flow: column;
  margin-block: $space-small;
}

.row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-small;
}

.code {
  display: inline-flex;
  max-width: 73%;
}

.comment {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  justify-self: right;
  display: inline-flex;
  gap: $space-x-small;
}
</style>
