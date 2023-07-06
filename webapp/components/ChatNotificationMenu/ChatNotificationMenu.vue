<template>
  <nuxt-link
  v-if="!unreadChatNotificationsCount"
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
  <dropdown v-else class="notifications-menu" offset="8" :placement="placement">
    <template #default="{ toggleMenu }">
      <base-button
        ghost
        circle
        v-tooltip="{
          content: $t('notifications.headerMenuButton.tooltip'),
          placement: 'bottom-start',
        }"
        @click="toggleMenu"
      >
      <counter-icon icon="" :count="unreadChatNotificationsCount" danger />
      <img src="/img/empty/chat-bubble.svg"/>
       
      </base-button>
    </template>
    <template #popover="{}">
      <div class="notifications-menu-popover">
        <div v-for="notification in notifications" v-bind:key="notification.roomid">
            
            <ds-space>

             <div class="notifications-menu-popover-item" @click="$store.commit('chat-modul/SET_OPEN_CHAT_MODUL', { showChatModul: true , roomID: notification.roomid })">
            <p>{{ notification.name }}</p>
            {{ notification.title }}</div>
            </ds-space>
        </div>
        <!-- <notification-list :notifications="notifications" /> -->
      </div>
      <ds-flex class="notifications-link-container">
        <ds-flex-item class="notifications-link-container-item" :width="{ base: '100%' }" centered>
          <nuxt-link :to="{ name: 'chat' }">
            <base-button ghost primary>
              All Chat Messages
            </base-button>
          </nuxt-link>
        </ds-flex-item>
      
      </ds-flex>
    </template>
  </dropdown>
</template>

<script>
import CounterIcon from '~/components/_new/generic/CounterIcon/CounterIcon'
import Dropdown from '~/components/Dropdown'
import NotificationList from '../NotificationList/NotificationList'

export default {
  name: 'ChatNotificationMenu',
  components: {
    CounterIcon,
    Dropdown,
    NotificationList,
  },
  data() {
    return {
      notifications: [ 
        {roomid: 'u1', name: 'Jenny', title: 'last Message from Jenny'},
        {roomid: 'u2', name: 'Honey', title: 'last Message from Honey'},
        {roomid: 'u3', name: 'Bob der Baumeister', title: 'last Message from Bob der Baumeister'},
       ], 
    }
  },
 computed: {
    unreadChatNotificationsCount() {
      const result = this.notifications.reduce((count, notification) => {
        return notification.read ? count : count + 1
      }, 0)
      return result
    },
    hasNotifications() {
      return this.notifications.length
    },
 }
}
</script>
<style lang="scss">
.notifications-menu {
    max-width: 500px;
}
.vue-popover-theme {
 
  z-index: 1000000;
}
 
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
