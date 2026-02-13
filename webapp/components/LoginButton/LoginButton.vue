<template>
  <dropdown class="login-button" offset="8" :placement="placement">
    <template #default="{ toggleMenu }">
      <os-button data-test="login-btn" variant="primary" appearance="ghost" circle :aria-label="$t('login.login')" @click.prevent="toggleMenu">
        <template #icon>
          <base-icon name="sign-in" />
        </template>
      </os-button>
    </template>
    <template #popover>
      <div class="login-button-menu-popover">
        <nuxt-link class="login-link" :to="{ name: 'login' }">
          <base-icon name="sign-in" />
          {{ $t('login.login') }}
        </nuxt-link>
      </div>
    </template>
  </dropdown>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import Dropdown from '~/components/Dropdown'

export default {
  components: {
    OsButton,
    Dropdown,
  },
  props: {
    placement: { type: String, default: 'top-end' },
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
