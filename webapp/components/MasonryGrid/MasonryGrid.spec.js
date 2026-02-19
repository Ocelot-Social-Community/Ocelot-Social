import { mount } from '@vue/test-utils'
import Vue from 'vue'
import MasonryGrid from './MasonryGrid'

const localVue = global.localVue

describe('MasonryGrid', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(MasonryGrid, { localVue })
  })

  it('adds the "reset-grid-height" class when itemsCalculating is more than 0', async () => {
    wrapper.setData({ itemsCalculating: 1 })
    await Vue.nextTick()
    expect(wrapper.classes()).toContain('reset-grid-height')
  })

  it('removes the "reset-grid-height" class when itemsCalculating is 0', async () => {
    wrapper.setData({ itemsCalculating: 0 })
    await Vue.nextTick()
    expect(wrapper.classes()).not.toContain('reset-grid-height')
  })

  it('adds 1 to itemsCalculating when "calculating-item-height" is emitted', async () => {
    wrapper.setData({ itemsCalculating: 0 })
    wrapper.vm.$emit('calculating-item-height')
    await Vue.nextTick()
    expect(wrapper.vm.itemsCalculating).toBe(1)
  })

  it('subtracts 1 from itemsCalculating when "finished-calculating-item-height" is emitted', async () => {
    wrapper.setData({ itemsCalculating: 2 })
    wrapper.vm.$emit('finished-calculating-item-height')
    await Vue.nextTick()
    expect(wrapper.vm.itemsCalculating).toBe(1)
  })
})
