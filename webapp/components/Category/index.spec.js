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
      icon = 'home'
      name = 'Peter'
    })

    it('shows Name', () => {
      expect(Wrapper().text()).toContain('Peter')
    })

    it('shows icon', () => {
      expect(Wrapper().find('.os-icon').exists()).toBe(true)
    })
  })
})
