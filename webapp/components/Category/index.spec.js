import { mount } from '@vue/test-utils'

import Category from './index'

const localVue = global.localVue

describe('Category', () => {
  let icon
  let name

  const Wrapper = () => {
    return mount(Category, {
      localVue,
      propsData: {
        icon,
        name,
      },
    })
  }

  describe('given Strings for Icon and Name', () => {
    beforeEach(() => {
      icon = 'mouse-pointer'
      name = 'Peter'
    })

    it('shows Name', () => {
      expect(Wrapper().text()).toContain('Peter')
    })

    it('shows base icon', () => {
      expect(Wrapper().find('.base-icon').exists()).toBe(true)
    })
  })
})
