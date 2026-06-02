import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import GetCategories from './getCategoriesMixin'

const localVue = global.localVue

const Component = {
  mixins: [GetCategories],
  render(h) {
    return h('div')
  },
}

const makeWrapper = ({ policyActive, categories }) => {
  const store = new Vuex.Store({
    getters: {
      'categories/categories': () => categories,
      'categories/isInitialized': () => true,
    },
    actions: {
      'categories/init': jest.fn(),
    },
  })
  return mount(Component, {
    localVue,
    store,
    mocks: { $policy: { get: () => policyActive } },
  })
}

describe('getCategoriesMixin', () => {
  describe('categoriesActive', () => {
    it('is true when the policy is enabled and categories exist', () => {
      const wrapper = makeWrapper({ policyActive: true, categories: [{ id: 'c1' }] })
      expect(wrapper.vm.categoriesActive).toBe(true)
    })

    it('is false when the policy is enabled but the DB has no categories', () => {
      const wrapper = makeWrapper({ policyActive: true, categories: [] })
      expect(wrapper.vm.categoriesActive).toBe(false)
    })

    it('is false when the policy is disabled even if categories exist', () => {
      const wrapper = makeWrapper({ policyActive: false, categories: [{ id: 'c1' }] })
      expect(wrapper.vm.categoriesActive).toBe(false)
    })
  })
})
