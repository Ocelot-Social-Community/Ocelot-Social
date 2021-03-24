<template>
  <dropdown class="invite-button" offset="8" :placement="placement">
    <template #default="{ toggleMenu }">
      <base-button icon="user-plus" circle ghost @click.prevent="toggleMenu" />
    </template>
    <template #popover>
      <div class="invite-button-menu-popover">
        <div v-if="inviteCode && inviteCode.code">
          <!-- Wolle <ds-text align="center">{{ $t('invite-codes.your-code') }}</ds-text> -->
          <!-- <ds-text align="center" bold>Copy to clipboard</ds-text> -->
          <!-- <p class="description">{{ $t(`invite-codes.your-code`) }}</p> -->
          <p class="description">{{ $t('invite-codes.your-code') }}</p>
          <base-card class="code-card" wideContent>
            <!-- Wolle <ds-text bold>As code</ds-text> -->
            <base-button
              v-if="canCopy"
              class="invite-code"
              icon="copy"
              ghost
              @click="copyInviteLink"
            >
              <ds-text bold>
                <!-- Wolle {{ inviteCode.code }} -->
                {{ $t('invite-codes.copy-code') }}
                {{ inviteCode.code }}
              </ds-text>
            </base-button>
            <!-- Wolle <ds-text bold>As link</ds-text> -->
            <!-- <base-button v-if="canCopy" icon="copy" ghost @click="copyInviteLink">
              <!-- Wolle {{ $t('invite-codes.copy-link') }} -->
              <!-- {{ $t('invite-codes.copy-link') }}
              {{ inviteLink | truncateStr(30) }}
            </base-button> -->
          </base-card>
        </div>
        <div v-else>
          <ds-text>{{ $t('invite-codes.not-available') }}</ds-text>
        </div>
      </div>
    </template>
  </dropdown>
</template>

<script>
import Dropdown from '~/components/Dropdown'
import gql from 'graphql-tag'
import BaseCard from '../_new/generic/BaseCard/BaseCard.vue'

export default {
  components: {
    Dropdown,
    BaseCard,
  },
  props: {
    placement: { type: String, default: 'top-end' },
  },
  data() {
    return {
      inviteCode: null,
      canCopy: false,
    }
  },
  created() {
    this.canCopy = !!navigator.clipboard
  },
  computed: {
    inviteLink() {
      return (
        'https://' +
        window.location.hostname +
        '/registration?method=invite-code&inviteCode=' +
        this.inviteCode.code
      )
    },
  },
  methods: {
    // Wolle async copyInviteCode() {
    //   await navigator.clipboard.writeText(this.inviteCode.code)
    //   this.$toast.success(this.$t('invite-codes.copy-success'))
    // },
    async copyInviteLink() {
      await navigator.clipboard.writeText(this.inviteLink)
      this.$toast.success(this.$t('invite-codes.copy-success'))
    },
  },
  apollo: {
    inviteCode: {
      query() {
        return gql`
          query {
            getInviteCode {
              code
            }
          }
        `
      },
      variables() {},
      update({ getInviteCode }) {
        return getInviteCode
      },
    },
  },
}
</script>

<style lang="scss" scope>
.invite-button {
  color: $color-secondary;
}

.invite-button-menu-popover {
  // Wolle text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;

  .description {
    margin-top: $space-x-small;
    margin-bottom: $space-x-small;
  }
  .code-card {
    margin-bottom: $space-x-small;
  }
}

.invite-code {
  left: 50%;
}
</style>
