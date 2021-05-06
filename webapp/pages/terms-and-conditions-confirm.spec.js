import Vuex from 'vuex'
import { config, mount } from '@vue/test-utils'
import TermsAndConditionsConfirm from './terms-and-conditions-confirm.vue'
import VueMeta from 'vue-meta'

const localVue = global.localVue
localVue.use(VueMeta, { keyName: 'head' })

config.stubs['nuxt-link'] = '<span class="nuxt-link"><slot /></span>'

describe('terms-and-conditions-confirm.vue', () => {
  let wrapper
  let mocks
  let store
  let asyncData
  let tosAgree
  let redirect

  beforeEach(() => {
    mocks = {
      $t: (t) => t,
    }
    asyncData = false
    tosAgree = false
    redirect = jest.fn()
  })

  describe('mount', () => {
    const Wrapper = async () => {
      store = new Vuex.Store({
        getters: {
          'auth/termsAndConditionsAgreed': () => tosAgree,
        },
      })
      if (asyncData) {
        const data = TermsAndConditionsConfirm.data ? TermsAndConditionsConfirm.data() : {}
        const aData = await TermsAndConditionsConfirm.asyncData({
          store,
          redirect,
        })
        TermsAndConditionsConfirm.data = function () {
          return { ...data, ...aData }
        }
      }
      return mount(TermsAndConditionsConfirm, {
        mocks,
        localVue,
      })
    }

    it('renders', async () => {
      wrapper = await Wrapper()
      expect(wrapper.is('div')).toBe(true)
    })

    it('has correct <head> content', async () => {
      wrapper = await Wrapper()
      expect(wrapper.vm.$metaInfo.title).toBe('termsAndConditions.newTermsAndConditions')
    })

    it('renders with asyncData and did not agree to TOS', async () => {
      asyncData = true
      wrapper = await Wrapper()
      expect(redirect).not.toHaveBeenCalled()
    })

    it('renders with asyncData and did agree to TOS', async () => {
      asyncData = true
      tosAgree = true
      wrapper = await Wrapper()
      expect(redirect).toBeCalledWith('/')
    })
  })
})
