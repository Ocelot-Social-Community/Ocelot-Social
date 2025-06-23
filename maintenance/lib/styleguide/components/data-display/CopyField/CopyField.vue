<template>
  <component
    :is="tag"
    class="ds-copy-field"
    :class="`ds-copy-field-${size}`">
    <div ref="text">
      <slot />
    </div>
    <div
      class="ds-copy-field-link">
      <ds-button
        @click="copy"
        icon="copy"
        color="soft"
        ghost/>
    </div>
    <transition name="ds-copy-field-message">
      <div
        v-show="showMessage"
        class="ds-copy-field-message">
        <div
          class="ds-copy-field-message-text"
          ref="messageText"/>
      </div>
    </transition>
  </component>
</template>

<script lang="ts">
import { defineComponent, nextTick } from 'vue';
import copyToClipboard from 'clipboard-copy'

import DsButton from '@@/components/navigation/Button/Button.vue';

/**
 * A copy field is used to present text that can easily
 * be copied to the users clipboard by clicking on it.
 * @version 1.0.0
 */
export default defineComponent({
  name: 'DsCopyField',

  components: {
    DsButton
  },

  props: {
    /**
     * The size used for the text.
     * @options small|base|large
     */
    size: {
      type: String,
      default: 'base',
      validator: value => {
        return value.match(/(small|base|large)/)
      }
    },
    /**
     * The html element name used for the copy field.
     */
    tag: {
      type: String,
      default: 'div'
    }
  },

  data() {
    return {
      showMessage: false
    }
  },

  methods: {
    copy() {
      const content = this.$refs.text.innerText
      this.$refs.messageText.innerText = content
      copyToClipboard(content)
      this.showMessage = true
      nextTick(() => {
        this.showMessage = false
      })
    }
  },
});
</script>

<style lang="scss" src="./style.scss">
</style>
