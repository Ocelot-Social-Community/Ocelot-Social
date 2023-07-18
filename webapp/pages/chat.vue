<template>
  <div>
    <ds-heading tag="h1">{{ $t('chat.page.headline') }}</ds-heading>
    <chat />
  </div>
</template>

<script>
import Chat from '../components/Chat/Chat.vue'

export default {
  components: { Chat },
}
</script>
