import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import OrderByFilter from './OrderByFilter'

const localVue = global.localVue

let wrapper

describe('OrderByFilter', () => {
  const mutations = {
    'posts/TOGGLE_ORDER': jest.fn(),
  }
  const getters = {
    'posts/filteredPostTypes': () => [],
    'posts/orderedByCreationDate': () => true,
    'posts/orderBy': () => 'sortDate_desc',
  }
  const actions = {
    'categories/init': jest.fn(),
  }

  const mocks = {
    $t: jest.fn((string) => string),
  }

  const Wrapper = () => {
    const store = new Vuex.Store({ mutations, getters, actions })
    const wrapper = mount(OrderByFilter, { mocks, localVue, store })
    return wrapper
  }

  beforeEach(() => {
    wrapper = Wrapper()
  })

  describe('mount', () => {
    describe('if ordered by newest', () => {
      it('sets "newest-button" attribute `filled`', () => {
        expect(
          wrapper
            .find('.order-by-filter .filter-list button[data-test="newest-button"]')
            .classes('--filled'),
        ).toBe(true)
      })

      it('don\'t sets "oldest-button" attribute `filled`', () => {
        expect(
          wrapper
            .find('.order-by-filter .filter-list button[data-test="oldest-button"]')
            .classes('--filled'),
        ).toBe(false)
      })
    })

    describe('if ordered by oldest', () => {
      beforeEach(() => {
        getters['posts/orderBy'] = jest.fn(() => 'sortDate_asc')
        wrapper = Wrapper()
      })

      it('don\'t sets "newest-button" attribute `filled`', () => {
        expect(
          wrapper
            .find('.order-by-filter .filter-list button[data-test="newest-button"]')
            .classes('--filled'),
        ).toBe(false)
      })

      it('sets "oldest-button" attribute `filled`', () => {
        expect(
          wrapper
            .find('.order-by-filter .filter-list button[data-test="oldest-button"]')
            .classes('--filled'),
        ).toBe(true)
      })
    })

    describe('click "newest-button"', () => {
      it('calls TOGGLE_ORDER with "sortDate_desc"', () => {
        wrapper
          .find('.order-by-filter .filter-list button[data-test="newest-button"]')
          .trigger('click')
        expect(mutations['posts/TOGGLE_ORDER']).toHaveBeenCalledWith({}, 'sortDate_desc')
      })
    })

    describe('click "oldest-button"', () => {
      it('calls TOGGLE_ORDER with "sortDate_asc"', () => {
        wrapper
          .find('.order-by-filter .filter-list button[data-test="oldest-button"]')
          .trigger('click')
        expect(mutations['posts/TOGGLE_ORDER']).toHaveBeenCalledWith({}, 'sortDate_asc')
      })
    })
  })
})
