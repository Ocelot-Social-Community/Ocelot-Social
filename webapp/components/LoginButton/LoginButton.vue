<template>
  <dropdown class="login-button" offset="8" :placement="placement">
    <template #default="{ toggleMenu }">
      <base-button icon="sign-in" circle ghost @click.prevent="toggleMenu" />
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
import Dropdown from '~/components/Dropdown'

export default {
  components: {
    Dropdown,
  },
  props: {
    placement: { type: String, default: 'top-end' },
  },
}
</script>

<style lang="scss" scope>
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
    color: $text-color-base;
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
