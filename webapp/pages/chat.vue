<template>
  <div>
    <chat :theme="theme" />
    <base-button @click="theme = theme === 'light' ? 'dark' : 'light'">
      change style mode
    </base-button>
  </div>
</template>

<script>
import Chat from '../components/Chat/Chat.vue'
import BaseButton from '../components/_new/generic/BaseButton/BaseButton.vue'

export default {
  components: { Chat, BaseButton },

  data() {
    return {
      theme: 'light',
    }
  },
}
</script>
<style lang="scss">
body {
  font-family: 'Quicksand', sans-serif;
}
</style>
