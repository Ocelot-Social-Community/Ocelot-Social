<template>
    <div class="header-menu">
    
      <ds-menu v-if="show" :routes="menu" navbar style="margin-right: 20px"></ds-menu>
 
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