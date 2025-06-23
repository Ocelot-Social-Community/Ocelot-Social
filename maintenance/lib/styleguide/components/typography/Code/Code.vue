<template>
  <component
    :is="inline ? 'code' : 'pre'"
    class="ds-code"
    :class="[
      inline && `ds-code-inline`
    ]"
  >
    <slot />
  </component>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

/**
 * The code component is used for displaying lines of code.
 * @version 1.0.0
 */
export default defineComponent({
  name: 'DsCode',

  props: {
    /**
     * Display the code inline.
     */
    inline: {
      type: Boolean,
      default: false
    }
  },
});
</script>

<style lang="scss" src="./style.scss">
</style>

