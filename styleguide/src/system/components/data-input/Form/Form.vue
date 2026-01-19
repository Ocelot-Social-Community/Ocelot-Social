<template>
  <form 
    class="ds-form" 
    @submit.prevent="submit" 
    novalidate="true" 
    autocomplete="off">
    <slot 
      :errors="errors" 
      :reset="reset"/>
  </form>
</template>

<script>
import Schema from 'async-validator'
import cloneDeep from 'clone-deep'
import dotProp from 'dot-prop'
// Disable warnings to console
Schema.warning = function() {}

/**
 * Used for handling complex user input.
 * @version 1.0.0
 */
export default {
  name: 'DsForm',
  provide() {
    return {
      $parentForm: this
    }
  },
  props: {
    /**
     * The value of the input. Can be passed via v-model.
     */
    value: {
      type: Object,
      required: true
    },
    /**
     * The async-validator schema used for the form data.
     */
    schema: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      newData: null,
      subscriber: [],
      errors: null
    }
  },
  watch: {
    value: {
      handler(value) {
        this.newData = cloneDeep(value)
        this.notify(value, this.errors)
      },
      deep: true
    }
  },
  methods: {
    submit() {
      this.validate(() => {
        /**
         * Fires on form submit.
         * Receives the current form data.
         *
         * @event submit
         */
        this.$emit('submit', this.newData)
      })
    },
    validate(cb) {
      const validator = new Schema(this.schema)
      validator.validate(this.newData, errors => {
        if (errors) {
          this.errors = errors.reduce((errorObj, error) => {
            const result = { ...errorObj }
            result[error.field] = error.message
            return result
          }, {})
        } else {
          this.errors = null
        }
        this.notify(this.newData, this.errors)
        if (!errors && cb && typeof cb === 'function') {
          cb()
        }
      })
    },
    subscribe(cb) {
      if (cb && typeof cb === 'function') {
        cb(cloneDeep(this.newData))
        this.subscriber.push(cb)
      }
    },
    unsubscribe(cb) {
      const index = this.subscriber.findIndex(cb)
      if (index > -1) {
        this.subscriber.splice(index, 1)
      }
    },
    notify(data, errors) {
      this.subscriber.forEach(cb => {
        cb(cloneDeep(data), errors)
      })
    },
    async update(model, value) {
      dotProp.set(this.newData, model, value)
      /**
       * Fires after user input.
       * Receives the current form data.
       * The form data is not validated and can be invalid.
       * This event is fired before the input-valid event.
       *
       * @event input
       */
      await this.$emit('input', cloneDeep(this.newData))
      this.validate(() => {
        /**
         * Fires after user input.
         * Receives the current form data.
         * This is only called if the form data is successfully validated.
         *
         * @event input-valid
         */
        this.$emit('input-valid', cloneDeep(this.newData))
      })
    },
    reset() {
      /**
       * Fires after reset() was called.
       * Receives the current form data.
       * Reset has to be handled manually.
       *
       * @event reset
       */
      this.$emit('reset', cloneDeep(this.value))
    }
  },
  created() {
    this.newData = cloneDeep(this.value)
  }
}
</script>

<style lang="scss" src="./style.scss">
</style>

<docs src="./demo.md"></docs>
