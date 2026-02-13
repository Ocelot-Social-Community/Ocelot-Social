import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import CategoriesFilter from './CategoriesFilter'

const localVue = global.localVue

let wrapper, environmentAndNatureButton

describe('CategoriesFilter.vue', () => {
  const mutations = {
    'posts/TOGGLE_CATEGORY': jest.fn(),
    'posts/RESET_CATEGORIES': jest.fn(),
  }
  const getters = {
    'posts/filteredCategoryIds': jest.fn(() => []),
    'categories/categories': jest.fn().mockReturnValue([
      { id: 'cat4', name: 'Environment & Nature', icon: 'tree', slug: 'environment-nature' },
      {
        id: 'cat15',
        name: 'Consumption & Sustainability',
        icon: 'shopping-cart',
        slug: 'consumption-sustainability',
      },
      {
        id: 'cat9',
        name: 'Democracy & Politics',
        icon: 'university',
        slug: 'democracy-politics',
      },
    ]),
  }
  const actions = {
    'categories/init': jest.fn(),
  }

  const apolloMutationMock = jest.fn().mockResolvedValue({
    data: { saveCategorySettings: true },
  })

  const mocks = {
    $t: jest.fn((string) => string),
    $apollo: {
      mutate: apolloMutationMock,
    },
    $toast: {
      success: jest.fn(),
      error: jest.fn(),
    },
  }

  const Wrapper = () => {
    const store = new Vuex.Store({ mutations, getters, actions })
    const wrapper = mount(CategoriesFilter, { mocks, localVue, store })
    return wrapper
  }

  beforeEach(() => {
    wrapper = Wrapper()
  })

  describe('mount', () => {
    it('starts with all categories button active', () => {
      expect(
        wrapper
          .find('.categories-filter .item-all-topics button[data-appearance="filled"]')
          .exists(),
      ).toBe(true)
    })

    // TODO move to FilterMenuComponent.spec.js?
    // it('sets category button attribute `filled` when corresponding category is filtered', async () => {
    //   getters['posts/filteredCategoryIds'] = jest.fn(() => ['cat9'])
    //   wrapper = await Wrapper()
    //   democracyAndPoliticsButton = wrapper.find('.categories-filter .item-save-topics button')
    //   expect(democracyAndPoliticsButton.attributes().class).toContain('--filled')
    // })

    describe('click on an "catetories-buttons" button', () => {
      it('calls TOGGLE_CATEGORY when clicked', () => {
        environmentAndNatureButton = wrapper.findAll('.category-filter-list button').at(0)
        environmentAndNatureButton.trigger('click')
        expect(mutations['posts/TOGGLE_CATEGORY']).toHaveBeenCalledWith({}, 'cat15')
      })
    })

    describe('clears filter', () => {
      it('when all button is clicked', async () => {
        getters['posts/filteredCategoryIds'] = jest.fn(() => ['cat9'])
        wrapper = await Wrapper()
        const allCategoriesButton = wrapper.find('.categories-filter .item-all-topics button')
        allCategoriesButton.trigger('click')
        expect(mutations['posts/RESET_CATEGORIES']).toHaveBeenCalledTimes(1)
      })
    })

    // TODO move to FilterMenuComponent.spec.js?
    // describe('save categories', () => {
    //   it('calls the API', async () => {
    //     wrapper = await Wrapper()
    //     const saveButton = wrapper.find('.categories-filter .item-save-topics button')
    //     saveButton.trigger('click')
    //     expect(apolloMutationMock).toBeCalled()
    //   })
    // })
  })
})
