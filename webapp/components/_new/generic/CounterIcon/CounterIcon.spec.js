import { mount } from '@vue/test-utils'
import CounterIcon from './CounterIcon'
import { OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'

const localVue = global.localVue

describe('CounterIcon.vue', () => {
  let propsData, wrapper, count

  const Wrapper = () => {
    return mount(CounterIcon, { propsData, localVue })
  }

  describe('given a valid icon and count below 100', () => {
    beforeEach(() => {
      propsData = { icon: ocelotIcons.comments, count: 42 }
      wrapper = Wrapper()
      count = wrapper.find('.count')
    })

    it('renders the icon', () => {
      expect(wrapper.findComponent(OsIcon).exists()).toBe(true)
    })

    it('renders the count', () => {
      expect(count.text()).toEqual('42')
    })
  })

  describe('given a valid icon and count above 100', () => {
    beforeEach(() => {
      propsData = { icon: ocelotIcons.comments, count: 750 }
      wrapper = Wrapper()
      count = wrapper.find('.count')
    })

    it('renders the icon', () => {
      expect(wrapper.findComponent(OsIcon).exists()).toBe(true)
    })

    it('renders the capped count with a plus', () => {
      expect(count.text()).toEqual('99+')
    })
  })
})
