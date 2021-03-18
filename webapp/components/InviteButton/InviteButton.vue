<template>
  <dropdown class="invite-button" offset="8" :placement="placement">
    <template #default="{ toggleMenu }">
      <base-button icon="user-plus" circle ghost @click.prevent="toggleMenu" />
    </template>
    <template #popover>
      <div class="invite-button-menu-popover">
        <div v-if="inviteCode && inviteCode.code">
          <ds-text align="center">{{ $t('invite-codes.your-code') }}</ds-text>
          <ds-text bold>
            {{ inviteCode.code }}
            <base-button
              v-if="canCopy"
              icon="copy"
              ghost
              size="small"
              @click="copyInviteCode"
            ></base-button>
          </ds-text>
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

export default {
  components: {
    Dropdown,
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
  methods: {
    async copyInviteCode() {
      await navigator.clipboard.writeText(this.inviteCode.code)
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

<style lang="scss">
.invite-button {
  color: $color-secondary;
}

.invite-button-menu-popover {
  text-align: center;
}
</style>
