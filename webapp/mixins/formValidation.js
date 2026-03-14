import Schema from 'async-validator'
import cloneDeep from 'clone-deep'

Schema.warning = function () {}

export default {
  provide() {
    return {
      $parentForm: this._formProxy,
    }
  },
  data() {
    return {
      formErrors: null,
      _formSubscribers: [],
    }
  },
  beforeCreate() {
    const vm = this
    this._formProxy = {
      subscribe(cb) {
        if (cb && typeof cb === 'function') {
          cb(cloneDeep(vm.formData))
          vm._formSubscribers.push(cb)
        }
      },
      unsubscribe(cb) {
        const index = vm._formSubscribers.indexOf(cb)
        if (index > -1) {
          vm._formSubscribers.splice(index, 1)
        }
      },
      update(model, value) {
        vm.updateFormField(model, value)
      },
    }
  },
  watch: {
    formData: {
      handler(value) {
        this._notifySubscribers(value, this.formErrors)
      },
      deep: true,
    },
  },
  methods: {
    updateFormField(model, value) {
      this.$set(this.formData, model, value)
      this._validateForm(() => {
        if (typeof this.handleInputValid === 'function') {
          this.handleInputValid(cloneDeep(this.formData))
        }
      })
      if (typeof this.handleInput === 'function') {
        this.handleInput(cloneDeep(this.formData))
      }
    },
    formSubmit(callback) {
      this._validateForm(() => {
        if (callback && typeof callback === 'function') {
          callback(cloneDeep(this.formData))
        }
      })
    },
    _validateForm(cb) {
      const schema = this.formSchema
      if (!schema || Object.keys(schema).length === 0) {
        this.formErrors = null
        this._notifySubscribers(this.formData, null)
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
        this._notifySubscribers(this.formData, this.formErrors)
        if (!errors && cb && typeof cb === 'function') {
          cb()
        }
      })
    },
    _notifySubscribers(data, errors) {
      this._formSubscribers.forEach((cb) => {
        cb(cloneDeep(data), errors)
      })
    },
  },
}
