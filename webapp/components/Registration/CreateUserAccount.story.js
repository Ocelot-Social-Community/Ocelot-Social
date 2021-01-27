import { storiesOf } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import { action } from '@storybook/addon-actions'
import Vuex from 'vuex'
import helpers from '~/storybook/helpers'
import links from '~/constants/links.js'
import metadata from '~/constants/metadata.js'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import CreateUserAccount from './CreateUserAccount.vue'

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

storiesOf('CreateUserAccount', module)
  .addDecorator(withA11y)
  .addDecorator(helpers.layout)
  .add('standard', () => ({
    components: { LocaleSwitch, CreateUserAccount },
    store: createStore({ loginSuccess: true }),
    data: () => ({
      links,
      metadata,
      nonce: 'A34RB56',
      email: 'user@example.org',
    }),
    methods: {
      handleSuccess() {
        action('You are logged in!')()
      },
    },
    template: `
      <ds-container width="small">
        <base-card>
          <template #imageColumn>
            <a :href="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)" target="_blank">
              <img class="image" alt="Sign up" src="/img/custom/sign-up.svg" />
            </a>
          </template>
          <create-user-account @userCreated="handleSuccess" :email="email" :nonce="nonce" />
          <template #topMenu>
            <locale-switch offset="5" />
          </template>
        </base-card>
      </ds-container>
    `,
  }))
