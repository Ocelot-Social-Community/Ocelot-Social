<template>
  <li class="invitation">
    <div class="column1">
      <div class="code">
        {{ inviteCode.code }}
        <span v-if="inviteCode.comment" class="mdash">—</span>
        <span v-if="inviteCode.comment" class="comment">{{ inviteCode.comment }}</span>
      </div>
      <div>
        <span v-if="inviteCode.redeemedByCount === 0">
          {{ $t('invite-codes.redeemed-count-0') }}
        </span>
        <span v-else>
          {{ $t('invite-codes.redeemed-count', { count: inviteCode.redeemedByCount }) }}
        </span>
      </div>
    </div>
    <div class="actions">
      <base-button
        circle
        class="copy-button"
        icon="copy"
        @click="copyInviteCode(inviteCode.copy)"
        :disabled="!canCopy"
        :aria-label="$t('invite-codes.copy-code')"
      />
      <base-button
        circle
        class="invalidate-button"
        icon="trash"
        @click="openDeleteModal"
        :aria-label="$t('invite-codes.invalidate')"
      />
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
  padding: calc($space-base / 2);
  border-bottom: 1px dotted #e5e3e8;
  align-items: center;
}

.invitation:nth-child(odd) {
  background-color: $color-neutral-90;
}

.invitation:nth-child(even) {
  background-color: white;
}

.column1 {
  flex: auto;
  display: flex;
  flex-flow: column;
  gap: $space-xx-small;
  max-width: var(--invitation-column-max-width, 100%);
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
  display: inline-flex;
  gap: $space-x-small;
}

.mdash {
  margin-inline: $space-x-small;
}
</style>
