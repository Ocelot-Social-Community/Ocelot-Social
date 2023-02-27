import { shallowMount } from '@vue/test-utils'

import Hashtag from './Hashtag'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
}

describe('Hashtag', () => {
  let id

  const Wrapper = () => {
    return shallowMount(Hashtag, {
      localVue,
      propsData: {
        id,
      },
      stubs,
    })
  }

  describe('given a String for Name', () => {
    beforeEach(() => {
      id = 'Liebe'
    })

    it('shows Name', () => {
      expect(Wrapper().text()).toContain('Liebe')
    })
  })
})
