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
        <base-button class="invalidate-button" icon="trash" @click="openDeleteModal" />
      </div>
    </div>
    <div class="row2">
      <span v-if="inviteCode.redeemedByCount === 0">
        {{ $t('invite-codes.redeemed-count-0') }}
      </span>
      <span v-else>
        {{ $t('invite-codes.redeemed-count', { count: inviteCode.redeemedByCount }) }}
      </span>
    </div>
  </li>
</template>

<script>
import { mapMutations } from 'vuex'
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
    copyMessage: {
      type: String,
      default: '',
    },
  },
  computed: {
    inviteLink() {
      return `${window.location.origin}/registration?method=invite-code&inviteCode=${this.inviteCode.code}`
    },
    inviteMessageAndLink() {
      return this.copyMessage ? `${this.copyMessage} ${this.inviteLink}` : this.inviteLink
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
    ...mapMutations({
      commitModalData: 'modal/SET_OPEN',
    }),
    async copyInviteCode() {
      await navigator.clipboard.writeText(this.inviteMessageAndLink)
      this.$toast.success(this.$t('invite-codes.copy-success'))
    },
    openDeleteModal() {
      this.commitModalData({
        name: 'confirm',
        data: {
          type: '',
          resource: { id: '' },
          modalData: {
            titleIdent: this.$t('invite-codes.delete-modal.title'),
            messageIdent: this.$t('invite-codes.delete-modal.message'),
            buttons: {
              confirm: {
                danger: true,
                icon: 'trash',
                textIdent: 'actions.delete',
                callback: () => {
                  this.$emit('invalidate-invite-code', this.inviteCode.code)
                },
              },
              cancel: {
                icon: 'close',
                textIdent: 'actions.cancel',
                callback: () => {},
              },
            },
          },
        },
      })
    },
  },
}
</script>

<style scoped lang="scss">
.invitation {
  display: flex;
  flex-flow: column;
  margin-block: $space-small;
  border-radius: 8px;
  padding: 16px;
  background-color: rgb(from $color-primary r g b / var(--invitation-opacity));
}

.invitation:hover {
  --invitation-opacity: 0.5;
}

.inviation:nth-child(even) {
  --invitation-opacity: 0.2;
}

.invitation:nth-child(odd) {
  --invitation-opacity: 0.3;
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
