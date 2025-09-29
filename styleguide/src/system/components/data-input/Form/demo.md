## Basic usage

Most commonly you want the form to handle a set of data and display appropriate input fields for each piece of data.

```html
<template>
  <ds-form
    v-model="formData"
    @submit="handleSubmit">
    <ds-input
      icon="at"
      model="email"
      label="Email"
      type="email"
      placeholder="Your email address ..."></ds-input>
    <ds-input
      icon="lock"
      model="password"
      label="Password"
      placeholder="Your password ..."></ds-input>
    <ds-space margin-top="base">
      <ds-button primary>Login</ds-button>
    </ds-space>
  </ds-form>
</template>
<script>
  export default {
    data() {
      return {
        formData: {
          email: '',
          password: ''
        }
      }
    },
    methods: {
      handleSubmit(data) {
        console.log('Submit form ...', data)
      }
    }
  }
</script>
```

## Advanced usage / Validation

Use a schema to provide validation for the form inputs. Use scoped slots to get access to the forms errors and functions like reset.

```html
<template>
  <ds-form
    v-model="formData"
    @submit="handleSubmit"
    @input="handleInput"
    @input-valid="handleInputValid"
    @reset="handleReset"
    :schema="formSchema">
    <template slot-scope="{ errors, reset }">
      <ds-input
        model="name"
        label="Name"
        placeholder="Your name ..."></ds-input>
      <ds-input
        icon="at"
        model="email"
        label="Email"
        type="email"
        placeholder="Your email address ..."></ds-input>
      <ds-input
        icon="at"
        model="emailConfirm"
        label="Confirm Email"
        type="email"
        placeholder="Confirm your email address ..."></ds-input>
      <ds-select
        icon="user"
        model="gender"
        label="Gender"
        :options="['male', 'female']"
        placeholder="Gender ..."></ds-select>
      <ds-select
        icon="globe"
        model="settings.languages"
        label="Language"
        :options="['en','de','fr','it']"
        multiple></ds-select>
      <ds-input
        model="settings.status"
        label="Status"
        type="textarea"
        rows="3"></ds-input>
      <ds-space margin-top="large">
        <ds-button @click.prevent="reset()">
          Reset form
        </ds-button>
        <ds-button
          :disabled="disabled"
          icon="save"
          primary>
          Save profile
        </ds-button>
      </ds-space>
    </template>
  </ds-form>
</template>
<script>
  export default {
    data() {
      return {
        formData: {
          name: 'peter',
          gender: 'male',
          email: 'peter@maffay.com',
          settings: {
            languages: ['en'],
            status: 'I spy with my little eye, a girly I can get, cause she aint get to many likes.'
          }
        },
        // https://github.com/yiminghe/async-validator
        formSchema: {
          name: { required: true, message: 'Fill in a name' },
          email: { type: 'email', required: true, message: 'Fill in a valid email' },
          emailConfirm: [
            { validator: this.matchEmail },
            // the last entry is called first ¯\_(ツ)_/¯
            { type: 'email', required: true, message: 'Confirm your email'}
          ],
          settings: {
            type: 'object',
            fields: {
              status: { min: 20, max: 300, message: 'Write between 20 and 300 letters' }
            }
          }
        },
        disabled: true
      }
    },
    methods: {
      handleSubmit(data) {
        console.log('Submit form ...', data)
      },
      handleInput(data) {
        console.log('Input form ...', data)
        this.disabled = true
      },
      handleInputValid(data) {
        this.disabled = false
        console.log('Input-valid form ...', data)
      },
      handleReset(data) {
        console.log('Reset form ...', data)
      },

      matchEmail(rule, value, callback, source, options) {
        var errors = [];
        if(this.formData.email !== value) {
          errors.push(new Error('EMail missmatch'));
        }
        callback(errors);
      }
    }
  }
</script>
```
