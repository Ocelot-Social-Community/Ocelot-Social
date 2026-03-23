<template>
  <div class="ds-form-item" :class="stateClasses">
    <label class="ds-input-label" v-show="!!label" :for="id">
      {{ label }}
    </label>
    <div class="ds-input-wrap">
      <div v-if="icon" class="ds-input-icon">
        <os-icon :icon="resolvedIcon" />
      </div>
      <component
        class="ds-input"
        :class="[icon && 'ds-input-has-icon', iconRight && 'ds-input-has-icon-right']"
        :id="id"
        :name="name ? name : model"
        :type="type"
        :autofocus="autofocus"
        :placeholder="placeholder"
        :tabindex="tabindex"
        :disabled="disabled"
        :readonly="readonly"
        :is="tag"
        :value.prop="innerValue"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        :rows="type === 'textarea' ? rows : null"
      />
      <div v-if="iconRight" class="ds-input-icon-right">
        <os-icon :icon="resolvedIconRight" />
      </div>
    </div>
    <transition name="ds-input-error">
      <div class="ds-input-error" v-show="!!error">
        {{ error }}
      </div>
    </transition>
  </div>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { resolveIcon } from '~/utils/iconRegistry'
import Schema from 'async-validator'

Schema.warning = function () {}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj)
}

export default {
  name: 'OcelotInput',
  components: { OsIcon },
  inject: {
    $parentForm: {
      default: null,
    },
  },
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
    schema: {
      type: Object,
      default: () => null,
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
    type: {
      type: String,
      default: 'text',
      validator: (value) => /^(url|text|password|email|search|textarea)$/.test(value),
    },
    placeholder: {
      type: String,
      default: null,
    },
    autofocus: {
      type: Boolean,
      default: false,
    },
    rows: {
      type: [String, Number],
      default: 1,
    },
    icon: {
      type: String,
      default: null,
    },
    iconRight: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      innerValue: null,
      error: null,
      focus: false,
    }
  },
  computed: {
    tag() {
      if (this.type === 'textarea') {
        return 'textarea'
      }
      return 'input'
    },
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
  },
  watch: {
    value: {
      handler(value) {
        this.innerValue = value
      },
      deep: true,
      immediate: true,
    },
  },
  created() {
    if (this.$parentForm && this.model) {
      this.$parentForm.subscribe(this.handleFormUpdate)
    }
  },
  beforeDestroy() {
    if (this.$parentForm && this.model) {
      this.$parentForm.unsubscribe(this.handleFormUpdate)
    }
  },
  methods: {
    handleInput(event) {
      this.input(event.target.value)
    },
    input(value) {
      this.innerValue = value
      if (this.$parentForm && this.model) {
        this.$parentForm.update(this.model, value)
      } else {
        this.$emit('input', value)
        this.validate(value)
      }
    },
    handleFormUpdate(data, errors) {
      this.innerValue = getNestedValue(data, this.model)
      this.error = errors ? errors[this.model] : null
    },
    validate(value) {
      if (!this.schema) {
        return
      }
      const validator = new Schema({ input: this.schema })
      validator.validate({ input: value }, (errors) => {
        if (errors) {
          this.error = errors[0].message
        } else {
          this.error = null
        }
      })
    },
    handleFocus() {
      this.focus = true
    },
    handleBlur() {
      this.focus = false
    },
  },
}
</script>

<style lang="scss">
/* Styles inherited from global styleguide CSS (ds-input, ds-form-item classes).
 * Once ds-input is fully removed from the styleguide, move the styles here. */
</style>
