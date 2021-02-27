import { storiesOf } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import RegistrationSlider from './RegistrationSlider.vue'
import helpers from '~/storybook/helpers'
import Vue from 'vue'

const plugins = [
  (app = {}) => {
    app.$apollo = {
      mutate: (data) => {
        if (JSON.stringify(data).includes('UpdateUser')) {
          return { data: { UpdateUser: { id: data.variables.id, locale: data.variables.locale } } }
        }
        if (JSON.stringify(data).includes('Signup')) {
          return { data: { Signup: { email: data.variables.email } } }
        }
        if (JSON.stringify(data).includes('SignupByInvitation')) {
          return { data: { SignupByInvitation: { email: data.variables.email } } }
        }
        throw new Error(`Mutation name not found!`)
      },
      query: (data) => {
        if (JSON.stringify(data).includes('isValidInviteCode')) {
          return { data: { isValidInviteCode: true } }
        }
        throw new Error(`Query name not found!`)
      },
    }
    Vue.prototype.$apollo = app.$apollo
    return app
  },
]
helpers.init({ plugins })

storiesOf('RegistrationSlider', module)
  .addDecorator(withA11y)
  .addDecorator(helpers.layout)
  .add('invite-code empty', () => ({
    components: { RegistrationSlider },
    store: helpers.store,
    data: () => ({}),
    template: `
      <registration-slider registrationType="invite-code" />
    `,
  }))
  .add('invite-code with data', () => ({
    components: { RegistrationSlider },
    store: helpers.store,
    data: () => ({
      overwriteSliderData: {
        collectedInputData: {
          inviteCode: 'IN1T6Y',
          email: 'wolle.huss@pjannto.com',
          emailSend: true,
          nonce: 'NTRSCZ',
          name: 'Wolle',
          password: 'Hello',
          passwordConfirmation: 'Hello',
          about: `Hey`,
          termsAndConditionsAgreedVersion: null,
          termsAndConditionsConfirmed: true,
          dataPrivacy: true,
          minimumAge: true,
          noCommercial: true,
          noPolitical: true,
          locale: null,
        },
      },
    }),
    template: `
      <registration-slider registrationType="invite-code" :overwriteSliderData="overwriteSliderData" />
    `,
  }))
  .add('public-registration empty', () => ({
    components: { RegistrationSlider },
    store: helpers.store,
    data: () => ({}),
    template: `
      <registration-slider registrationType="public-registration" />
    `,
  }))
  .add('public-registration with data', () => ({
    components: { RegistrationSlider },
    store: helpers.store,
    data: () => ({
      overwriteSliderData: {
        collectedInputData: {
          inviteCode: null,
          email: 'wolle.huss@pjannto.com',
          emailSend: false,
          nonce: 'NTRSCZ',
          name: 'Wolle',
          password: 'Hello',
          passwordConfirmation: 'Hello',
          about: `Hey`,
          termsAndConditionsAgreedVersion: null,
          termsAndConditionsConfirmed: true,
          dataPrivacy: true,
          minimumAge: true,
          noCommercial: true,
          noPolitical: true,
          locale: null,
        },
      },
    }),
    template: `
      <registration-slider registrationType="public-registration" :overwriteSliderData="overwriteSliderData" />
    `,
  }))
  .add('invite-mail empty', () => ({
    components: { RegistrationSlider },
    store: helpers.store,
    data: () => ({
      overwriteSliderData: {
        collectedInputData: {
          inviteCode: null,
          email: 'wolle.huss@pjannto.com',
          emailSend: true,
          nonce: null,
          name: null,
          password: null,
          passwordConfirmation: null,
          about: null,
          termsAndConditionsAgreedVersion: null,
          termsAndConditionsConfirmed: null,
          dataPrivacy: null,
          minimumAge: null,
          noCommercial: null,
          noPolitical: null,
          locale: null,
        },
      },
    }),
    template: `
      <registration-slider registrationType="invite-mail" :overwriteSliderData="overwriteSliderData" />
    `,
  }))
  .add('invite-mail with data', () => ({
    components: { RegistrationSlider },
    store: helpers.store,
    data: () => ({
      overwriteSliderData: {
        collectedInputData: {
          inviteCode: null,
          email: 'wolle.huss@pjannto.com',
          emailSend: null,
          nonce: 'NTRSCZ',
          name: 'Wolle',
          password: 'Hello',
          passwordConfirmation: 'Hello',
          about: `Hey`,
          termsAndConditionsAgreedVersion: null,
          termsAndConditionsConfirmed: true,
          dataPrivacy: true,
          minimumAge: true,
          noCommercial: true,
          noPolitical: true,
          locale: null,
        },
      },
    }),
    template: `
      <registration-slider registrationType="invite-mail" :overwriteSliderData="overwriteSliderData" />
    `,
  }))
