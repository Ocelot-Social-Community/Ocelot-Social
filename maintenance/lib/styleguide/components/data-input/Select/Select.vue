<template>
  <ds-form-item>
    <div
      v-click-outside="closeAndBlur"
      class="ds-select-wrap"
      :class="[
        isOpen && `ds-select-is-open`
      ]"
      :tabindex="searchable ? -1 : tabindex"
      @keydown.tab="closeAndBlur"
      @keydown.self.down.prevent="pointerNext"
      @keydown.self.up.prevent="pointerPrev"
      @keypress.enter.prevent.stop="handleEnter"
      @keyup.esc="close">
      <div
        v-if="icon"
        class="ds-select-icon">
        <ds-icon :name="icon"/>
      </div>
      <div
        class="ds-select"
        :class="[
          icon && `ds-select-has-icon`,
          iconRight && `ds-select-has-icon-right`,
          multiple && `ds-select-multiple`
      ]"
        @click="openAndFocus">
        <div
          v-if="multiple"
          class="ds-selected-options">
          <div
            v-for="(value, index) in innerValue"
            :key="value[labelProp] || value"
            class="ds-selected-option">
            <!-- @slot Slot to provide a custom selected option display -->
            <slot
              name="optionitem"
              :model-value="value">
              <ds-chip
                removable
                color="primary"
                :size="size"
                @remove="deselectOption(index)">
                {{ value[labelProp] || value }}
              </ds-chip>
            </slot>
          </div>
          <input
            :id="id"
            ref="search"
            v-model="searchString"
            class="ds-select-search"
            autocomplete="off"
            :name="name ? name : model"
            :autofocus="autofocus"
            :placeholder="placeholder"
            :tabindex="tabindex"
            :disabled="disabled"
            @focus="openAndFocus"
            @keydown.tab="closeAndBlur"
            @keydown.delete.stop="deselectLastOption"
            @keydown.down.prevent="handleKeyDown"
            @keydown.up.prevent="handleKeyUp"
            @keypress.enter.prevent.stop="handleEnter"
            @keyup.esc="close">
        </div>
        <div
          v-else
          class="ds-select-value">
          <!-- @slot Slot to provide a custom value display -->
          <slot
            v-if="innerValue"
            name="value"
            :model-value="innerValue">
            {{ innerValue[labelProp] || innerValue }}
          </slot>
          <div
            v-else-if="placeholder"
            class="ds-select-placeholder">
            {{ placeholder }}
          </div>
        </div>
        <input
          v-if="!multiple"
          :id="id"
          ref="search"
          v-model="searchString"
          class="ds-select-search"
          autocomplete="off"
          :name="name ? name : model"
          :autofocus="autofocus"
          :placeholder="placeholder"
          :tabindex="tabindex"
          :disabled="disabled"
          @focus="openAndFocus"
          @keydown.tab="closeAndBlur"
          @keydown.delete.stop="deselectLastOption"
          @keydown.down.prevent="handleKeyDown"
          @keydown.up.prevent="handleKeyUp"
          @keypress.enter.prevent.stop="handleEnter"
          @keyup.esc="close">
      </div>
      <div class="ds-select-dropdown">
        <div
          v-if="!options || !options.length"
          class="ds-select-dropdown-message">
          {{ noOptionsAvailable }}
        </div>
        <div
          v-else-if="!filteredOptions.length"
          class="ds-select-dropdown-message">
          {{ noOptionsFound }} "{{ searchString }}"
        </div>
        <ul
          v-else
          ref="options"
          class="ds-select-options">
          <li
            v-for="(option, index) in filteredOptions"
            :key="option[labelProp] || option"
            class="ds-select-option"
            :class="[
              isSelected(option) && `ds-select-option-is-selected`,
              pointer === index && `ds-select-option-hover`
            ]"
            @click="handleSelect(option)"
            @mouseover="setPointer(index)">
            <!-- @slot Slot to provide custom option items -->
            <slot
              name="option"
              :option="option">
              {{ option[labelProp] || option }}
            </slot>
          </li>
        </ul>
      </div>
      <div class="ds-select-icon-right">
        <ds-spinner
          v-if="loading"
          primary
          size="small"
          style="position: absolute"
        />
        <ds-icon
          v-if="iconRight"
          :name="iconRight"
        />
      </div>
    </div>
  </ds-form-item>
</template>

<script lang="ts">
import { defineComponent, nextTick } from 'vue';

import inputMixin from '../shared/input'
import multiinputMixin from '../shared/multiinput'
import ClickOutside from 'vue-click-outside'
import DsFormItem from '@@/components/data-input/FormItem/FormItem.vue'
import DsChip from '@@/components/typography/Chip/Chip.vue'
import DsIcon from '@@/components/typography/Icon/Icon.vue'

/**
 * Used for letting the user choose values from a set of options.
 * @version 1.0.0
 */
export default defineComponent({
  name: 'DsSelect',

  components: {
    DsFormItem,
    DsChip,
    DsIcon
  },

  directives: {
    ClickOutside
  },
  mixins: [inputMixin, multiinputMixin],

  props: {
    /**
     * The placeholder shown when value is empty.
     */
    placeholder: {
      type: String,
      default: null
    },
    /**
     * Whether the input should be automatically focused
     */
    autofocus: {
      type: Boolean,
      default: false
    },
    /**
     * The name of the input's icon.
     */
    icon: {
      type: String,
      default: null
    },
    /**
     * The name of the input's right icon.
     */
    iconRight: {
      type: String,
      default: 'angle-down'
    },
    /**
     * The select options.
     */
    options: {
      type: Array,
      default() {
        return []
      }
    },
    /**
     * The prop to use as the label when options are objects
     */
    labelProp: {
      type: String,
      default: 'label'
    },
    /**
     * Whether the options are searchable
     */
    searchable: {
      type: Boolean,
      default: true
    },
    /**
     * Wheter the search string inside the inputfield should be resetted
     * when selected
     */
    autoResetSearch: {
      type: Boolean,
      default: true
    },
    /**
     * Should a loading indicator be shown?
     */
    loading: {
      type: Boolean,
      default: false
    },
    /**
     * Function to filter the results
     */
    filter: {
      type: Function,
      default: (option, searchString = '', labelProp) => {
        const value = option[labelProp] || option
        const searchParts = (typeof searchString === 'string') ? searchString.split(' ') : []
        return searchParts.every(part => {
          if (!part) {
            return true
          }
          return value.toLowerCase().includes(part.toLowerCase())
        })
      }
    },
    /**
     * Message to show when no options are available
     */
    noOptionsAvailable: {
      type: String,
      default: 'No options available.'
    },
    /**
     * Message to show when the search result is empty
     */
    noOptionsFound: {
      type: String,
      default: 'No options found for:'
    }
  },
  emits: ['enter'],

  data() {
    return {
      searchString: '',
      pointer: 0,
      isOpen: false
    }
  },

  computed: {
    filteredOptions() {
      if (!this.searchString) {
        return this.options
      }

      return this.options.filter((option) => this.filter(option, this.searchString, this.labelProp))
    },
    pointerMax() {
      return this.filteredOptions.length - 1
    }
  },

  watch: {
    pointerMax(max) {
      if (max < this.pointer) {
        nextTick(() => {
          this.pointer = max
        })
      }
    },
    searchString(value) {
      this.setPointer(-1)
    }
  },

  methods: {
    handleSelect(options) {
      if (this.pointerMax < 0) {
        return
      }
      this.selectOption(options)
      if (this.autoResetSearch || this.multiple) {
        this.resetSearch()
      }
      if (this.multiple) {
        this.$refs.search.focus()
        this.handleFocus()
      } else {
        this.close()
      }
    },
    resetSearch() {
      this.searchString = ''
    },
    openAndFocus() {
      this.open()

      if (this.autoResetSearch) {
        this.resetSearch()
      }

      if (!this.focus || this.multiple) {
        this.$refs.search.focus()
        this.handleFocus()
      }
    },
    open() {
      if (this.autoResetSearch || this.multiple) {
        this.resetSearch()
      }
      this.isOpen = true
    },
    close() {
      this.isOpen = false
    },
    closeAndBlur() {
      this.close()
      this.$refs.search.blur()
      this.handleBlur()
    },
    deselectLastOption() {
      if (
        this.multiple &&
        this.innerValue &&
        this.innerValue.length &&
        !this.searchString.length
      ) {
        this.deselectOption(this.innerValue.length - 1)
      }
    },
    handleEnter(e) {
      if (this.pointer >= 0) {
        this.selectPointerOption(e)
      } else {
        this.setPointer(-1)
        this.$emit('enter', e)
      }
    },
    handleKeyUp() {
      if (!this.isOpen) {
        this.open()
        return
      }
      this.pointerPrev()
    },
    handleKeyDown() {
      if (!this.isOpen) {
        this.open()
        return
      }
      this.pointerNext()
    },
    setPointer(index) {
      if (!this.hadKeyboardInput) {
        this.pointer = index
      }
    },
    pointerPrev() {
      if (this.pointer <= 0) {
        this.pointer = this.pointerMax
      } else {
        this.pointer--
      }
      this.scrollToHighlighted()
    },
    pointerNext() {
      if (this.pointer >= this.pointerMax) {
        this.pointer = 0
      } else {
        this.pointer++
      }
      this.scrollToHighlighted()
    },
    scrollToHighlighted() {
      clearTimeout(this.hadKeyboardInput)
      if (!this.$refs.options || !this.$refs.options.children.length || this.pointerMax <= -1) {
        return
      }
      this.hadKeyboardInput = setTimeout(() => {
        this.hadKeyboardInput = null
      }, 250)
      this.$refs.options.children[this.pointer].scrollIntoView({
        block: 'nearest'
      });
    },
    selectPointerOption() {
      this.handleSelect(this.filteredOptions[this.pointer])
    }
  },
});
</script>

<style lang="scss" src="./style.scss">
</style>

