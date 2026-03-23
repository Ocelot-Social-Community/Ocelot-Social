<template>
  <div class="ds-form-item" :class="stateClasses">
    <label class="ds-input-label" v-show="!!label" :for="id">
      {{ label }}
    </label>
    <div
      class="ds-select-wrap"
      :class="[isOpen && 'ds-select-is-open']"
      :tabindex="searchable ? -1 : tabindex"
      @keydown.tab="closeAndBlur"
      @keydown.self.down.prevent="pointerNext"
      @keydown.self.up.prevent="pointerPrev"
      @keypress.enter.prevent.stop="handleEnter"
      @keyup.esc="close"
    >
      <div v-if="resolvedIcon" class="ds-select-icon">
        <os-icon :icon="resolvedIcon" />
      </div>
      <div
        class="ds-select"
        @click="openAndFocus"
        :class="[
          resolvedIcon && 'ds-select-has-icon',
          resolvedIconRight && 'ds-select-has-icon-right',
          multiple && 'ds-select-multiple',
        ]"
      >
        <div v-if="multiple" class="ds-selected-options">
          <div
            class="ds-selected-option"
            v-for="(val, index) in innerValue"
            :key="val[labelProp] || val"
          >
            <slot name="optionitem" :value="val">
              <os-badge removable @remove="deselectOption(index)" variant="primary" :size="size">
                {{ val[labelProp] || val }}
              </os-badge>
            </slot>
          </div>
          <input
            ref="search"
            class="ds-select-search"
            autocomplete="off"
            :id="id"
            :name="name ? name : model"
            :autofocus="autofocus"
            :placeholder="placeholder"
            :tabindex="tabindex"
            :disabled="disabled"
            v-model="searchString"
            @focus="openAndFocus"
            @keydown.tab="closeAndBlur"
            @keydown.delete.stop="deselectLastOption"
            @keydown.down.prevent="handleKeyDown"
            @keydown.up.prevent="handleKeyUp"
            @keypress.enter.prevent.stop="handleEnter"
            @keyup.esc="close"
          />
        </div>
        <div v-else class="ds-select-value">
          <slot v-if="innerValue" name="value" :value="innerValue">
            {{ innerValue[labelProp] || innerValue }}
          </slot>
          <div v-else-if="placeholder" class="ds-select-placeholder">
            {{ placeholder }}
          </div>
        </div>
        <input
          v-if="!multiple"
          ref="search"
          class="ds-select-search"
          autocomplete="off"
          :id="id"
          :name="name ? name : model"
          :autofocus="autofocus"
          :placeholder="placeholder"
          :tabindex="tabindex"
          :disabled="disabled"
          v-model="searchString"
          @focus="openAndFocus"
          @keydown.tab="closeAndBlur"
          @keydown.delete.stop="deselectLastOption"
          @keydown.down.prevent="handleKeyDown"
          @keydown.up.prevent="handleKeyUp"
          @keypress.enter.prevent.stop="handleEnter"
          @keyup.esc="close"
        />
      </div>
      <div class="ds-select-dropdown">
        <div class="ds-select-dropdown-message" v-if="!options || !options.length">
          {{ noOptionsAvailable }}
        </div>
        <div class="ds-select-dropdown-message" v-else-if="!filteredOptions.length">
          {{ noOptionsFound }} "{{ searchString }}"
        </div>
        <ul class="ds-select-options" ref="options" v-else>
          <li
            class="ds-select-option"
            :class="[
              isSelected(option) && 'ds-select-option-is-selected',
              pointer === index && 'ds-select-option-hover',
            ]"
            v-for="(option, index) in filteredOptions"
            @click="handleSelect(option)"
            @mouseover="setPointer(index)"
            :key="option[labelProp] || option"
          >
            <slot name="option" :option="option">
              {{ option[labelProp] || option }}
            </slot>
          </li>
        </ul>
      </div>
      <div class="ds-select-icon-right">
        <os-spinner v-if="loading" primary size="small" style="position: absolute" />
        <os-icon v-if="resolvedIconRight" :icon="resolvedIconRight" />
      </div>
    </div>
  </div>
</template>

<script>
import { OsIcon, OsBadge, OsSpinner } from '@ocelot-social/ui'
import { resolveIcon } from '~/utils/iconRegistry'

export default {
  name: 'OcelotSelect',
  components: { OsIcon, OsBadge, OsSpinner },
  props: {
    value: {
      type: [String, Object, Number, Array],
      default: null,
    },
    model: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      default: null,
    },
    label: {
      type: String,
      default: null,
    },
    id: {
      type: String,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'base',
      validator: (value) => /^(small|base|large)$/.test(value),
    },
    tabindex: {
      type: Number,
      default: 0,
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: null,
    },
    autofocus: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
      default: null,
    },
    iconRight: {
      type: String,
      default: 'angle-down',
    },
    options: {
      type: Array,
      default: () => [],
    },
    labelProp: {
      type: String,
      default: 'label',
    },
    searchable: {
      type: Boolean,
      default: true,
    },
    autoResetSearch: {
      type: Boolean,
      default: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    filter: {
      type: Function,
      default: (option, searchString = '', labelProp) => {
        const value = option[labelProp] || option
        const searchParts = typeof searchString === 'string' ? searchString.split(' ') : []
        return searchParts.every((part) => {
          if (!part) return true
          return value.toLowerCase().includes(part.toLowerCase())
        })
      },
    },
    noOptionsAvailable: {
      type: String,
      default: 'No options available.',
    },
    noOptionsFound: {
      type: String,
      default: 'No options found for:',
    },
  },
  data() {
    return {
      innerValue: null,
      error: null,
      focus: false,
      searchString: '',
      pointer: 0,
      isOpen: false,
      hadKeyboardInput: null,
    }
  },
  computed: {
    resolvedIcon() {
      return resolveIcon(this.icon)
    },
    resolvedIconRight() {
      return resolveIcon(this.iconRight)
    },
    stateClasses() {
      return [
        this.size && `ds-input-size-${this.size}`,
        this.disabled && 'ds-input-is-disabled',
        this.readonly && 'ds-input-is-readonly',
        this.error && 'ds-input-has-error',
        this.focus && 'ds-input-has-focus',
      ]
    },
    filteredOptions() {
      if (!this.searchString) return this.options
      return this.options.filter((option) => this.filter(option, this.searchString, this.labelProp))
    },
    pointerMax() {
      return this.filteredOptions.length - 1
    },
  },
  watch: {
    value: {
      handler(value) {
        this.innerValue = value
      },
      deep: true,
      immediate: true,
    },
    pointerMax(max) {
      if (max < this.pointer) {
        this.$nextTick(() => {
          this.pointer = max
        })
      }
    },
    searchString() {
      this.setPointer(-1)
    },
  },
  mounted() {
    this._clickOutsideHandler = (e) => {
      if (!this.$el.contains(e.target)) {
        this.closeAndBlur()
      }
    }
    document.addEventListener('click', this._clickOutsideHandler, true)
  },
  beforeDestroy() {
    document.removeEventListener('click', this._clickOutsideHandler, true)
  },
  methods: {
    // --- Input / Value ---
    input(value) {
      this.innerValue = value
      this.$emit('input', value)
    },

    // --- Selection ---
    selectOption(option) {
      if (this.multiple) {
        this.selectMultiOption(option)
      } else {
        this.input(option)
      }
    },
    selectMultiOption(value) {
      if (!this.innerValue) return this.input([value])
      const index = this.innerValue.indexOf(value)
      if (index < 0) return this.input([...this.innerValue, value])
      this.deselectOption(index)
    },
    deselectOption(index) {
      const newArray = [...this.innerValue]
      newArray.splice(index, 1)
      this.input(newArray)
    },
    deselectLastOption() {
      if (this.multiple && this.innerValue && this.innerValue.length && !this.searchString.length) {
        this.deselectOption(this.innerValue.length - 1)
      }
    },
    isSelected(option) {
      if (!this.innerValue) return false
      if (this.multiple) return this.innerValue.includes(option)
      return this.innerValue === option
    },

    // --- Select interaction ---
    handleSelect(option) {
      if (this.pointerMax < 0) return
      this.selectOption(option)
      if (this.autoResetSearch || this.multiple) this.resetSearch()
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
      if (this.autoResetSearch) this.resetSearch()
      if (!this.focus || this.multiple) {
        this.$refs.search.focus()
        this.handleFocus()
      }
    },
    open() {
      if (this.autoResetSearch || this.multiple) this.resetSearch()
      this.isOpen = true
    },
    close() {
      this.isOpen = false
    },
    closeAndBlur() {
      this.close()
      if (this.$refs.search) this.$refs.search.blur()
      this.handleBlur()
    },
    handleFocus() {
      this.focus = true
    },
    handleBlur() {
      this.focus = false
    },

    // --- Keyboard navigation ---
    handleEnter(e) {
      if (this.pointer >= 0) {
        this.selectPointerOption()
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
      if (!this.hadKeyboardInput) this.pointer = index
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
      if (!this.$refs.options || !this.$refs.options.children.length || this.pointerMax <= -1)
        return
      this.hadKeyboardInput = setTimeout(() => {
        this.hadKeyboardInput = null
      }, 250)
      this.$refs.options.children[this.pointer].scrollIntoView({ block: 'nearest' })
    },
    selectPointerOption() {
      this.handleSelect(this.filteredOptions[this.pointer])
    },
  },
}
</script>

<style lang="scss">
/* Styles inherited from global styleguide CSS (ds-select, ds-form-item classes).
 * Once ds-select is fully removed from the styleguide, move the styles here. */
</style>
