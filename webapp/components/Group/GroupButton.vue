<template>
  <div>
    <nuxt-link to="/groups">
      <os-button
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
    </nuxt-link>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  components: { OsButton },
}
</script>
