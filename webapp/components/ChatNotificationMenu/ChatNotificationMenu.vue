<template>
  <nuxt-link
    class="chat-menu"
    :to="{ name: 'chat' }"
  >
    <base-button
      ghost
      circle
      v-tooltip="{
        content: $t('notifications.headerMenuButton.chat'),
        placement: 'bottom-start',
      }"
    ><img src="/img/empty/chat-bubble.svg"/>
    </base-button>
  
  </nuxt-link>
  
</template>

<script>
 

export default {
  name: 'ChatMenu',
 
}
</script>

<style lang="scss">
.counter-icon {
  position: relative;

  > .count {
    position: absolute;
    top: -$space-xx-small;
    right: 0;

    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: $size-icon-base;
    min-width: $size-icon-base;
    padding: 3px; // magic number to center count
    border-radius: 50%;
    transform: translateX(50%);

    color: $color-neutral-100;
    background-color: $color-primary;
    font-size: 10px; // magic number to center count
    line-height: 1;
    text-align: center;

    &.--danger {
      background-color: $color-danger;
    }

    &.--inactive {
      background-color: $color-neutral-60;
    }

    &.--soft {
      background-color: $color-neutral-90;
      color: $text-color-soft;
    }
  }
}
</style>
