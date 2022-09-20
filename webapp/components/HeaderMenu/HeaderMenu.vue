<template>
  <div class="display-flex">
    <!-- <ds-flex v-if="show"> -->

    <ds-flex-item v-for="item in menu" :key="item.name">
      <a v-if="item.url" :href="item.url" target="_blank" class="margin-x">
        <ds-text size="large" bold>
          {{ item.name }}
        </ds-text>
      </a>
      <nuxt-link v-else :to="item.path" class="margin-x">
        <ds-text size="large" bold>
          {{ item.name }}
        </ds-text>
      </nuxt-link>
    </ds-flex-item>

    <!-- </ds-flex> -->
  </div>
</template>
<script>
import headerMenu from '../../constants/headerMenu.js'

export default {
  name: 'HeaderMenu',
  data() {
    return {
      show: headerMenu.SHOW_HEADER_MENU,
      menu: headerMenu.MENU,
    }
  },
}
</script>
<style lang="scss">
.display-flex {
  display: flex;
}
.margin-x {
  margin-left: $space-small;
  margin-right: $space-small;
  white-space: nowrap;
}
</style>
