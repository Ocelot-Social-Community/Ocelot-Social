import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import FilterMenu from './FilterMenu.vue'

const localVue = global.localVue
let wrapper

describe('FilterMenu.vue', () => {
  const mocks = {
    $t: jest.fn((string) => string),
  }

  const getters = {
    'posts/isActive': () => false,
    'posts/filteredPostTypes': () => [],
    'posts/orderBy': () => 'sortDate_desc',
    'categories/categoriesActive': () => false,
  }
  const actions = {
    'categories/init': jest.fn(),
  }

  const stubs = {
    FollowingFilter: true,
    PostTypeFilter: true,
    CategoriesFilter: true,
    EmotionsFilter: true,
    LanguagesFilter: true,
  }

  const Wrapper = () => {
    const store = new Vuex.Store({ getters, actions })
    return mount(FilterMenu, { mocks, localVue, store, stubs })
  }

  beforeEach(() => {
    wrapper = Wrapper()
  })

  describe('mount', () => {
    it('starts with dropdown button inactive', () => {
      expect(wrapper.find('.filter-menu button[data-appearance="ghost"]').exists()).toBe(true)
    })

    it('sets dropdown button attribute `filled` when a filter is applied', () => {
      getters['posts/isActive'] = jest.fn(() => true)
      wrapper = Wrapper()
      expect(wrapper.find('.filter-menu button[data-appearance="filled"]').exists()).toBe(true)
    })
  })
})
