<template>
  <transition name="ds-input-error">
    <div
      class="ds-input-error"
      v-show="!!error">
      {{ error }}
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

/**
 * @version 1.0.0
 * @private
 */
export default defineComponent({
  name: 'DsInputError',

  props: {
    error: {
      type: String,
      required: false,
      default: null
    }
  },
});
</script>
