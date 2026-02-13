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
      <os-button
        variant="primary"
        appearance="outline"
        circle
        class="copy-button"
        @click="copyInviteCode"
        :disabled="!canCopy"
        :aria-label="$t('invite-codes.copy-code')"
      >
        <template #icon>
          <base-icon name="copy" />
        </template>
      </os-button>
      <os-button
        variant="primary"
        appearance="outline"
        circle
        class="invalidate-button"
        @click="openDeleteModal"
        :aria-label="$t('invite-codes.invalidate')"
      >
        <template #icon>
          <base-icon name="trash" />
        </template>
      </os-button>
    </div>
  </li>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { mapMutations } from 'vuex'

export default {
  name: 'Invitation',
  components: {
    OsButton,
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
