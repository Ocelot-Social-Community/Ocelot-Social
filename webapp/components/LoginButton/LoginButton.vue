<template>
  <dropdown class="login-button" offset="8" :placement="placement">
    <template #default="{ toggleMenu }">
      <os-button
        data-test="login-btn"
        variant="primary"
        appearance="ghost"
        circle
        :aria-label="$t('login.login')"
        @click.prevent="toggleMenu"
      >
        <template #icon>
          <os-icon :icon="icons.signIn" />
        </template>
      </os-button>
    </template>
    <template #popover>
      <div class="login-button-menu-popover">
        <nuxt-link class="login-link" :to="{ name: 'login' }">
          <os-icon :icon="icons.signIn" />
          {{ $t('login.login') }}
        </nuxt-link>
      </div>
    </template>
  </dropdown>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import Dropdown from '~/components/Dropdown'

export default {
  components: {
    OsButton,
    OsIcon,
    Dropdown,
  },
  props: {
    placement: { type: String, default: 'top-end' },
  },
  created() {
    this.icons = iconRegistry
  },
}
</script>

<style lang="scss" scoped>
.login-button {
  color: $color-secondary;
}

.login-button-menu-popover {
  padding-top: $space-x-small;
  padding-bottom: $space-x-small;
  hr {
    color: $color-neutral-90;
    background-color: $color-neutral-90;
  }
  .login-link {
    color: $text-color-link;
    padding-top: $space-xx-small;
    &:hover {
      color: $text-color-link-active;
    }
  }
}

.invite-code {
  left: 50%;
}
</style>
