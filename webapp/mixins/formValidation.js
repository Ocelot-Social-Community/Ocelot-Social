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
    }
  },
  beforeCreate() {
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
  watch: {
    formData: {
      handler(value) {
        this.$notifyFormSubscribers(value, this.formErrors)
      },
      deep: true,
    },
  },
  methods: {
    updateFormField(model, value) {
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
    formSubmit(callback) {
      this.$validateForm(() => {
        if (callback && typeof callback === 'function') {
          callback(cloneDeep(this.formData))
        }
      })
    },
    $validateForm(cb) {
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
        if (errors) {
          this.formErrors = errors.reduce((errorObj, error) => {
            const result = { ...errorObj }
            result[error.field] = error.message
            return result
          }, {})
        } else {
          this.formErrors = null
        }
        this.$notifyFormSubscribers(this.formData, this.formErrors)
        if (!errors && cb && typeof cb === 'function') {
          cb()
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
