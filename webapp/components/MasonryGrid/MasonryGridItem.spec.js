import { mount } from '@vue/test-utils'
import MasonryGridItem from './MasonryGridItem'

const localVue = global.localVue

describe('MasonryGridItem', () => {
  let wrapper

  describe('given an imageAspectRatio', () => {
    it('sets the initial rowSpan to 114 when the ratio is higher than 1.3', () => {
      const propsData = { imageAspectRatio: 2 }
      wrapper = mount(MasonryGridItem, { localVue, propsData })

      expect(wrapper.vm.rowSpan).toBe(114)
    })

    it('sets the initial rowSpan to 132 when the ratio is between 1.3 and 1', () => {
      const propsData = { imageAspectRatio: 1.1 }
      wrapper = mount(MasonryGridItem, { localVue, propsData })

      expect(wrapper.vm.rowSpan).toBe(132)
    })

    it('sets the initial rowSpan to 159 when the ratio is between 1 and 0.7', () => {
      const propsData = { imageAspectRatio: 0.7 }
      wrapper = mount(MasonryGridItem, { localVue, propsData })

      expect(wrapper.vm.rowSpan).toBe(159)
    })

    it('sets the initial rowSpan to 222 when the ratio is lower than 0.7', () => {
      const propsData = { imageAspectRatio: 0.3 }
      wrapper = mount(MasonryGridItem, { localVue, propsData })
      expect(wrapper.vm.rowSpan).toBe(222)
    })

    describe('given no aspect ratio', () => {
      it('sets the initial rowSpan to 69 when not given an imageAspectRatio', () => {
        wrapper = mount(MasonryGridItem, { localVue })
        expect(wrapper.vm.rowSpan).toBe(69)
      })
    })
  })
})
