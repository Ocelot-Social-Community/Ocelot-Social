import { mount } from '@vue/test-utils'
import LayoutToggle from './LayoutToggle'

const localVue = global.localVue

describe('LayoutToggle', () => {
  let wrapper
  let storageMap

  beforeEach(() => {
    storageMap = {}
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storageMap[key] ?? null)
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => {
      storageMap[key] = val
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const mocks = {
    $t: jest.fn((t) => t),
  }

  const Wrapper = (propsData = {}) => {
    return mount(LayoutToggle, {
      localVue,
      mocks,
      propsData,
      stubs: { ClientOnly: { template: '<div><slot /></div>' } },
    })
  }

  it('renders two buttons', () => {
    wrapper = Wrapper()
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(2)
  })

  it('shows first button as filled when value is true (single column)', () => {
    wrapper = Wrapper({ value: true })
    const buttons = wrapper.findAll('.os-button')
    expect(buttons.at(0).attributes('data-appearance')).toBe('filled')
    expect(buttons.at(1).attributes('data-appearance')).toBe('ghost')
  })

  it('shows second button as filled when value is false (multi column)', () => {
    wrapper = Wrapper({ value: false })
    const buttons = wrapper.findAll('.os-button')
    expect(buttons.at(0).attributes('data-appearance')).toBe('ghost')
    expect(buttons.at(1).attributes('data-appearance')).toBe('filled')
  })

  it('emits input with true when single-column button is clicked', async () => {
    wrapper = Wrapper({ value: false })
    const buttons = wrapper.findAll('button')
    await buttons.at(0).trigger('click')
    expect(wrapper.emitted('input')).toEqual([[true]])
  })

  it('emits input with false when multi-column button is clicked', async () => {
    wrapper = Wrapper({ value: true })
    const buttons = wrapper.findAll('button')
    await buttons.at(1).trigger('click')
    expect(wrapper.emitted('input')).toEqual([[false]])
  })

  it('saves layout preference to localStorage on click', async () => {
    wrapper = Wrapper({ value: false })
    const buttons = wrapper.findAll('button')
    await buttons.at(0).trigger('click')
    expect(localStorage.setItem).toHaveBeenCalledWith('ocelot-layout-single-column', 'true')
  })

  it('reads layout preference from localStorage on mount', () => {
    storageMap['ocelot-layout-single-column'] = 'true'
    wrapper = Wrapper({ value: false })
    expect(wrapper.emitted('input')).toEqual([[true]])
  })

  it('adds layout-toggle--hidden class when isMobile is true', async () => {
    wrapper = Wrapper()
    wrapper.setData({ windowWidth: 400 })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.layout-toggle').classes()).toContain('layout-toggle--hidden')
  })

  it('does not add layout-toggle--hidden class on desktop', async () => {
    wrapper = Wrapper()
    wrapper.setData({ windowWidth: 1200 })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.layout-toggle').classes()).not.toContain('layout-toggle--hidden')
  })

  it('has radiogroup role for accessibility', () => {
    wrapper = Wrapper()
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(true)
  })

  it('sets aria-checked correctly on radio buttons', () => {
    wrapper = Wrapper({ value: true })
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.at(0).attributes('aria-checked')).toBe('true')
    expect(radios.at(1).attributes('aria-checked')).toBe('false')
  })
})
