<template>
  <button
    class="icon-button"
    @click.prevent="clickFunction"
  >
    <base-icon :name="icon" />
    <slot />
  </button>
</template>

<script>
import BaseIcon from '../BaseIcon/BaseIcon'

export default {
   components: {
      BaseIcon
   },
   props: {
      icon: {
         type: String,
      },

   }

}
</script>

<style>

.icon-button {
   background-color: red;
}
</style>