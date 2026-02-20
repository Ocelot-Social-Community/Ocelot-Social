import { mount } from '@vue/test-utils'
import Categories from './categories.vue'

const localVue = global.localVue

describe('categories.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key) => key),
    }
  })

  const Wrapper = (data) => {
    return mount(Categories, {
      mocks,
      localVue,
      data: () => data,
    })
  }

  describe('when categories exist', () => {
    beforeEach(() => {
      wrapper = Wrapper({
        Category: [
          { id: '1', name: 'Environment', slug: 'environment', icon: 'tree', postCount: 12 },
          { id: '2', name: 'Democracy', slug: 'democracy', icon: 'balance-scale', postCount: 5 },
        ],
      })
    })

    it('renders the table', () => {
      expect(wrapper.find('table').exists()).toBe(true)
    })

    it('renders a row for each category', () => {
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })

    it('does not show the empty placeholder', () => {
      expect(wrapper.find('.ds-placeholder').exists()).toBe(false)
    })
  })

  describe('when categories are empty', () => {
    beforeEach(() => {
      wrapper = Wrapper({ Category: [] })
    })

    it('does not render the table', () => {
      expect(wrapper.find('table').exists()).toBe(false)
    })

    it('shows the empty placeholder', () => {
      expect(wrapper.find('.ds-placeholder').exists()).toBe(true)
      expect(mocks.$t).toHaveBeenCalledWith('admin.categories.empty')
    })
  })
})
