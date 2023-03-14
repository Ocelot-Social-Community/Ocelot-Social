<template>
  <dropdown class="invite-button" offset="8" :placement="placement">
    <template #default="{ toggleMenu }">
      <base-button
        icon="user-plus"
        circle
        ghost
        v-tooltip="{
          content: $t('invite-codes.button.tooltip'),
          placement: 'bottom-start',
        }"
        @click.prevent="toggleMenu"
      />
    </template>
    <template #popover>
      <div class="invite-button-menu-popover">
        <div v-if="inviteCode && inviteCode.code">
          <p class="description">{{ $t('invite-codes.your-code') }}</p>
          <base-card class="code-card" wideContent>
            <base-button
              v-if="canCopy"
              class="invite-code"
              icon="copy"
              ghost
              @click="copyInviteLink"
            >
              <ds-text bold>{{ $t('invite-codes.copy-code') }}</ds-text>
            </base-button>
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
  margin-left: 25%;
}
</style>
