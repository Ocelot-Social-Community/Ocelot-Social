<template>
  <label
    class="ds-input-label"
    v-show="!!label">
    {{ label }}
  </label>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

/**
 * @version 1.0.0
 * @private
 */
export default defineComponent({
  name: 'DsInputLabel',

  props: {
    label: {
      type: String,
      required: false,
      default: null
    }
  },
});
</script>
