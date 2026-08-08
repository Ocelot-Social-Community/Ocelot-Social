import { storiesOf } from '@storybook/vue'
import { action } from '@storybook/addon-actions'
import Vuex from 'vuex'
import helpers from '~/storybook/helpers'
import RegistrationSlider from './RegistrationSlider.vue'

// $apollo (isValidInviteCode / VerifyNonce / UpdateUser / Signup / SignupVerification) is mocked
// globally in storybook/helpers.js — see the comment there for why it isn't set up per-file.
helpers.init()

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
          receiveCommunicationAsEmailsEtcConfirmed: true,
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
          receiveCommunicationAsEmailsEtcConfirmed: true,
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
          receiveCommunicationAsEmailsEtcConfirmed: null,
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
          receiveCommunicationAsEmailsEtcConfirmed: true,
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
