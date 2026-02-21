import { mount } from '@vue/test-utils'
import Vue from 'vue'
import MasonryGrid from './MasonryGrid'

const localVue = global.localVue

describe('MasonryGrid', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(MasonryGrid, { localVue })
  })

  it('adds the "reset-grid-height" class when measuring is true', async () => {
    wrapper.setData({ measuring: true })
    await Vue.nextTick()
    expect(wrapper.classes()).toContain('reset-grid-height')
  })

  it('removes the "reset-grid-height" class when measuring is false', async () => {
    wrapper.setData({ measuring: false })
    await Vue.nextTick()
    expect(wrapper.classes()).not.toContain('reset-grid-height')
  })

  it('sets inline grid styles', () => {
    expect(wrapper.element.style.gridAutoRows).toBe('20px')
    expect(wrapper.element.style.rowGap).toBe('16px')
    expect(wrapper.element.style.columnGap).toBe('16px')
  })
})
