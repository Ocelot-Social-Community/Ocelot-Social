import Schema from 'async-validator'

Schema.warning = function () {}

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export default {
  provide() {
    return {
      $parentForm: this.$formProxy,
    }
  },
  data() {
    return {
      formErrors: null,
      touchedFields: {},
      dirtyFields: {},
      submitAttempted: false,
    }
  },
  beforeCreate() {
    this._validateGen = 0
    const vm = this
    const subscribers = []
    this.$formProxy = {
      subscribe(cb) {
        if (cb && typeof cb === 'function') {
          cb(cloneDeep(vm.formData))
          subscribers.push(cb)
        }
      },
      unsubscribe(cb) {
        const index = subscribers.indexOf(cb)
        if (index > -1) {
          subscribers.splice(index, 1)
        }
      },
      update(model, value) {
        vm.updateFormField(model, value)
      },
    }
    this.$formSubscribers = subscribers
  },
  computed: {
    visibleErrors() {
      if (!this.formErrors) return null
      if (this.submitAttempted) return this.formErrors
      const filtered = Object.fromEntries(
        Object.entries(this.formErrors).filter(([field]) => this.touchedFields[field]),
      )
      return Object.keys(filtered).length ? filtered : null
    },
  },
  watch: {
    formData: {
      handler(value) {
        this.$notifyFormSubscribers(value, this.visibleErrors)
      },
      deep: true,
    },
  },
  methods: {
    touchField(field) {
      this.$set(this.touchedFields, field, true)
      this.$notifyFormSubscribers(this.formData, this.visibleErrors)
    },
    updateFormField(model, value) {
      this.$set(this.dirtyFields, model, true)
      this.$set(this.formData, model, value)
      if (typeof this.handleInput === 'function') {
        this.handleInput(cloneDeep(this.formData))
      }
      this.$validateForm(() => {
        if (typeof this.handleInputValid === 'function') {
          this.handleInputValid(cloneDeep(this.formData))
        }
      })
    },
    formSubmit(callback, onInvalid) {
      this.submitAttempted = true
      this.$validateForm(() => {
        if (callback && typeof callback === 'function') {
          callback(cloneDeep(this.formData))
        }
      }, onInvalid)
    },
    $validateForm(cb, onInvalid) {
      // Increment generation so callbacks from superseded runs are discarded.
      const gen = ++this._validateGen
      const schema = this.formSchema
      if (!schema || Object.keys(schema).length === 0) {
        this.formErrors = null
        this.$notifyFormSubscribers(this.formData, null)
        if (cb && typeof cb === 'function') {
          cb()
        }
        return
      }
      const validator = new Schema(schema)
      validator.validate(this.formData, (errors) => {
        if (gen !== this._validateGen) return
        if (errors) {
          this.formErrors = errors.reduce((errorObj, error) => {
            const result = { ...errorObj }
            result[error.field] = error.message
            return result
          }, {})
        } else {
          this.formErrors = null
        }
        this.$notifyFormSubscribers(this.formData, this.visibleErrors)
        if (!errors && cb && typeof cb === 'function') {
          cb()
        } else if (errors && onInvalid && typeof onInvalid === 'function') {
          onInvalid()
        }
      })
    },
    $notifyFormSubscribers(data, errors) {
      this.$formSubscribers.forEach((cb) => {
        cb(cloneDeep(data), errors)
      })
    },
  },
}
