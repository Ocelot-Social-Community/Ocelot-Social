import { mount } from '@vue/test-utils'
import { OsIcon } from '@ocelot-social/ui'
import { resolveIcon } from '~/utils/iconRegistry'

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
      const wrapper = Wrapper()
      expect(wrapper.findComponent(OsIcon).exists()).toBe(true)
      expect(wrapper.findComponent(OsIcon).props().icon).toBe(resolveIcon('home'))
    })
  })
})
