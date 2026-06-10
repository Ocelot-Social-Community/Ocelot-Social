import { mount } from '@vue/test-utils'
import GroupForm from './GroupForm.vue'
import Vuex from 'vuex'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
}

const propsData = {
  update: false,
  group: {},
}

describe('GroupForm', () => {
  let wrapper
  let mocks
  let storeMocks
  let store

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    storeMocks = {
      getters: {},
      actions: {
        'categories/init': jest.fn(),
      },
    }
    store = new Vuex.Store(storeMocks)
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(GroupForm, { propsData, mocks, localVue, stubs, store })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.group-form')).toHaveLength(1)
    })
  })

  describe('sameCategories', () => {
    const group = {
      id: '1',
      name: 'Test Group',
      slug: 'test-group',
      groupType: 'public',
      about: 'About',
      description: 'Description text',
      actionRadius: 'local',
      locationName: '',
      categories: [
        { id: 'cat-1', slug: 'family' },
        { id: 'cat-2', slug: 'work' },
        { id: 'cat-3', slug: 'psyche' },
      ],
    }

    beforeEach(() => {
      wrapper = mount(GroupForm, {
        propsData: { update: true, group },
        mocks,
        localVue,
        stubs,
        store,
      })
    })

    it('returns true when categories unchanged', () => {
      expect(wrapper.vm.sameCategories).toBe(true)
    })

    it('returns false when a category is deselected', async () => {
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2'])
      expect(wrapper.vm.sameCategories).toBe(false)
    })

    it('returns false when a category is swapped (same count)', async () => {
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2', 'cat-4'])
      expect(wrapper.vm.sameCategories).toBe(false)
    })

    it('returns true when same categories re-selected after deselect', async () => {
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2'])
      await wrapper.vm.$set(wrapper.vm.formData, 'categoryIds', ['cat-1', 'cat-2', 'cat-3'])
      expect(wrapper.vm.sameCategories).toBe(true)
    })
  })
})
