<template>
  <component
    :is="tag"
    class="ds-card"
    :class="[
      $slots.image && 'ds-card-has-image',
      primary && `ds-card-primary`,
      secondary && `ds-card-secondary`,
      centered && `ds-card-centered`,
      hover && `ds-card-hover`,
      space && `ds-card-space-${space}`
  ]">
    <div
      v-if="image || $slots.image"
      class="ds-card-image">
      <!-- @slot Content of the card's image -->
      <slot
        name="image"
        :image="image">
        <img
          v-if="!error"
          :src="image"
          @error="onError" >
      </slot>
    </div>
    <div
      v-if="icon"
      class="ds-card-icon">
      <ds-icon :name="icon"/>
    </div>
    <header
      v-if="header || $slots.header"
      class="ds-card-header">
      <!-- @slot Content of the card's header -->
      <slot name="header">
        <ds-heading
          :tag="headerTag"
          size="h3">{{ header }}</ds-heading>
      </slot>
    </header>
    <div class="ds-card-content">
      <template>
        <slot />
      </template>
    </div>
    <footer
      v-if="$slots.footer"
      class="ds-card-footer">
      <!-- @slot Content of the card's footer -->
      <slot name="footer"/>
    </footer>
  </component>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import DsIcon from '@@/components/typography/Icon/Icon.vue'
import DsHeading from '@@/components/typography/Heading/Heading.vue'

/**
 * A card is used to group content in an appealing way.
 * @version 1.0.0
 */
export default defineComponent({
  name: 'DsCard',
  components: {
    DsIcon,
    DsHeading,
  },
  props: {
    /**
     * The outtermost html tag
     */
    tag: {
      type: String,
      default: 'article'
    },
    /**
     * The card's header
     */
    header: {
      type: String,
      default: null
    },
    /**
     * The card's header tag
     * @options h1|h2|h3|h4|h5|h6
     */
    headerTag: {
      type: String,
      default: 'h3',
      validator: value => {
        return value.match(/(h1|h2|h3|h4|h5|h6)/)
      }
    },
    /**
     * The card's image
     */
    image: {
      type: String,
      default: null
    },
    /**
     * The card's icon
     */
    icon: {
      type: String,
      default: null
    },
    /**
     * Highlight with primary color
     */
    primary: {
      type: Boolean,
      default: false
    },
    /**
     * Highlight with secondary color
     */
    secondary: {
      type: Boolean,
      default: false
    },
    /**
     * Center the content
     */
    centered: {
      type: Boolean,
      default: false
    },
    /**
     * Make the card hoverable
     */
    hover: {
      type: Boolean,
      default: false
    },
    /**
     * If you need some spacing you can provide it here like for ds-space
     * @options small|large|x-large|xx-large
     */
    space: {
      type: String,
      default: null,
      validator: value => {
        return value.match(/(small|large|x-large|xx-large)/)
      }
    }
  },

  data() {
    return {
      error: false
    }
  },

  methods: {
    onError() {
      this.error = true
    }
  },
});
</script>

<style lang="scss" src="./style.scss">
</style>

