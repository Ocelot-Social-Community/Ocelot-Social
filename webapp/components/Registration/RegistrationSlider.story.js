import { storiesOf } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import { action } from '@storybook/addon-actions'
import Vuex from 'vuex'
import helpers from '~/storybook/helpers'
import Vue from 'vue'
import RegistrationSlider from './RegistrationSlider.vue'

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
        if (JSON.stringify(data).includes('SignupVerification')) {
          return { data: { SignupVerification: { ...data.variables } } }
        }
        throw new Error(`Mutation name not found!`)
      },
      query: (data) => {
        if (JSON.stringify(data).includes('isValidInviteCode')) {
          return { data: { isValidInviteCode: true } }
        }
        if (JSON.stringify(data).includes('VerifyNonce')) {
          return { data: { VerifyNonce: true } }
        }
        throw new Error(`Query name not found!`)
      },
    }
    Vue.prototype.$apollo = app.$apollo
    return app
  },
]
helpers.init({ plugins })

const createStore = ({ loginSuccess }) => {
  return new Vuex.Store({
    modules: {
      auth: {
        namespaced: true,
        state: () => ({
          pending: false,
        }),
        mutations: {
          SET_PENDING(state, pending) {
            state.pending = pending
          },
        },
        getters: {
          pending(state) {
            return !!state.pending
          },
        },
        actions: {
          async login({ commit, dispatch }, args) {
            action('Vuex action `auth/login`')(args)
            return new Promise((resolve, reject) => {
              commit('SET_PENDING', true)
              setTimeout(() => {
                commit('SET_PENDING', false)
                if (loginSuccess) {
                  resolve(loginSuccess)
                } else {
                  reject(new Error('Login unsuccessful'))
                }
              }, 1000)
            })
          },
        },
      },
    },
  })
}

storiesOf('RegistrationSlider', module)
  .addDecorator(withA11y)
  .addDecorator(helpers.layout)
  .add('invite-code empty', () => ({
    components: { RegistrationSlider },
    store: createStore({ loginSuccess: true }),
    data: () => ({}),
    template: `
      <registration-slider registrationType="invite-code" />
    `,
  }))
  .add('invite-code with data', () => ({
    components: { RegistrationSlider },
    store: createStore({ loginSuccess: true }),
    data: () => ({
      overwriteSliderData: {
        collectedInputData: {
          inviteCode: 'INZTBY',
          email: 'wolle.huss@pjannto.com',
          emailSend: false,
          nonce: '47539',
          name: 'Wolfgang',
          password: 'Hello',
          passwordConfirmation: 'Hello',
          termsAndConditionsConfirmed: true,
          recieveCommunicationAsEmailsEtcConfirmed: true,
        },
      },
    }),
    template: `
      <registration-slider registrationType="invite-code" :overwriteSliderData="overwriteSliderData" />
    `,
  }))
  .add('public-registration empty', () => ({
    components: { RegistrationSlider },
    store: createStore({ loginSuccess: true }),
    data: () => ({}),
    template: `
      <registration-slider registrationType="public-registration" />
    `,
  }))
  .add('public-registration with data', () => ({
    components: { RegistrationSlider },
    store: createStore({ loginSuccess: true }),
    data: () => ({
      overwriteSliderData: {
        collectedInputData: {
          inviteCode: null,
          email: 'wolle.huss@pjannto.com',
          emailSend: false,
          nonce: '47539',
          name: 'Wolfgang',
          password: 'Hello',
          passwordConfirmation: 'Hello',
          termsAndConditionsConfirmed: true,
          recieveCommunicationAsEmailsEtcConfirmed: true,
        },
      },
    }),
    template: `
      <registration-slider registrationType="public-registration" :overwriteSliderData="overwriteSliderData" />
    `,
  }))
  .add('invite-mail empty', () => ({
    components: { RegistrationSlider },
    store: createStore({ loginSuccess: true }),
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
          termsAndConditionsConfirmed: null,
          recieveCommunicationAsEmailsEtcConfirmed: null,
        },
      },
    }),
    template: `
      <registration-slider registrationType="invite-mail" :overwriteSliderData="overwriteSliderData" />
    `,
  }))
  .add('invite-mail with data', () => ({
    components: { RegistrationSlider },
    store: createStore({ loginSuccess: true }),
    data: () => ({
      overwriteSliderData: {
        collectedInputData: {
          inviteCode: null,
          email: 'wolle.huss@pjannto.com',
          emailSend: true,
          nonce: '47539',
          name: 'Wolfgang',
          password: 'Hello',
          passwordConfirmation: 'Hello',
          termsAndConditionsConfirmed: true,
          recieveCommunicationAsEmailsEtcConfirmed: true,
        },
      },
    }),
    template: `
      <registration-slider registrationType="invite-mail" :overwriteSliderData="overwriteSliderData" />
    `,
  }))
  .add('no-public-registration', () => ({
    components: { RegistrationSlider },
    store: createStore({ loginSuccess: true }),
    data: () => ({}),
    template: `
      <registration-slider registrationType="no-public-registration" />
    `,
  }))
