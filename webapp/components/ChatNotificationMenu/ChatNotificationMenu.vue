<template>
  <nuxt-link class="chat-notification-menu" :to="{ name: 'chat' }">
    <base-button
      ghost
      circle
      v-tooltip="{
        content: $t('header.chat.tooltip'),
        placement: 'bottom-start',
      }"
    >
      <counter-icon icon="chat-bubble" :count="1" danger />
    </base-button>
  </nuxt-link>
</template>

<script>
import CounterIcon from '~/components/_new/generic/CounterIcon/CounterIcon'

export default {
  name: 'ChatNotificationMenu',
  components: {
    CounterIcon,
  },
}
</script>
