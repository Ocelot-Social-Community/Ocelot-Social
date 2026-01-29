import { shallowMount } from '@vue/test-utils'

import Component from './CtaUnblockAuthor.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
}

describe('CtaUnblockAuthor.vue', () => {
  let propsData, wrapper, mocks

  beforeEach(() => {
    propsData = {
      author: {
        id: 'u-123',
        slug: 'user-123',
        name: 'User 123',
      },
    }
    mocks = {
      $t: jest.fn((t) => t),
    }
  })

  const Wrapper = () => {
    return shallowMount(Component, { propsData, localVue, mocks, stubs })
  }

  describe('shallowMount', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper).toMatchSnapshot()
    })
  })
})
