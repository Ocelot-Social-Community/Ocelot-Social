import { mount } from '@vue/test-utils'
import Vue from 'vue'
import MasonryGrid from './MasonryGrid'

const localVue = global.localVue

const GridChild = {
  template: '<div>child</div>',
  data() {
    return { rowSpan: 0 }
  },
}

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
    expect(wrapper.element.style.gridAutoRows).toBe('2px')
    expect(wrapper.element.style.rowGap).toBe('2px')
  })

  it('calculates rowSpan for children via batchRecalculate', async () => {
    wrapper = mount(MasonryGrid, {
      localVue,
      slots: { default: GridChild },
    })

    const child = wrapper.vm.$children[0]
    Object.defineProperty(child.$el, 'clientHeight', { value: 100, configurable: true })

    await wrapper.vm.batchRecalculate()

    // Math.ceil((100 + 2) / (2 + 2)) = Math.ceil(25.5) = 26
    expect(child.rowSpan).toBe(26)
    expect(wrapper.vm.measuring).toBe(false)
  })

  it('recalculates when child count changes in updated()', async () => {
    const Parent = {
      template: '<MasonryGrid><GridChild v-for="n in count" :key="n" /></MasonryGrid>',
      components: { MasonryGrid, GridChild },
      data() {
        return { count: 1 }
      },
    }
    wrapper = mount(Parent, { localVue })
    await Vue.nextTick()
    expect(wrapper.vm.$children[0].childCount).toBe(1)

    wrapper.setData({ count: 2 })
    await Vue.nextTick()
    await Vue.nextTick()
    expect(wrapper.vm.$children[0].childCount).toBe(2)
  })

  it('skips children without rowSpan', async () => {
    const NoRowSpan = { template: '<div>no rowSpan</div>' }
    wrapper = mount(MasonryGrid, {
      localVue,
      slots: { default: NoRowSpan },
    })

    await wrapper.vm.batchRecalculate()

    expect(wrapper.vm.measuring).toBe(false)
  })
})
