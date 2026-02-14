<template>
  <div>
    <os-button
      as="nuxt-link"
      to="/groups"
      variant="primary"
      appearance="ghost"
      circle
      :aria-label="$t('header.groups.tooltip')"
      v-tooltip="{
        content: $t('header.groups.tooltip'),
        placement: 'bottom-start',
      }"
    >
      <template #icon>
        <base-icon name="users" />
      </template>
    </os-button>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  components: { OsButton },
}
</script>
