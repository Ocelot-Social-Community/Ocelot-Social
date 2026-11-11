import { mount } from '@vue/test-utils'
import MenuLegend from './MenuLegend'

const localVue = global.localVue

// Renders the legend's popover right away instead of on a click.
const Dropdown = {
  template: '<div><slot :toggleMenu="() => {}" /><slot name="popover" /></div>',
}

describe('MenuLegend.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(MenuLegend, {
      mocks: { $t: (key) => key },
      localVue,
      stubs: { Dropdown },
    })
  })

  const shortcutFor = (name) =>
    wrapper
      .findAll('.legend-table')
      .filter((row) => row.text().includes(name))
      .at(0)
      .find('.tool-shortcut')
      .text()

  it.each([
    ['Win32', 'ctrl + k'],
    ['MacIntel', 'cmd + k'],
  ])('shows %s link shortcut as %s', (platform, shortcut) => {
    const platformSpy = jest.spyOn(window.navigator, 'platform', 'get').mockReturnValue(platform)
    try {
      wrapper = mount(MenuLegend, {
        mocks: { $t: (key) => key },
        localVue,
        stubs: { Dropdown },
      })
      expect(shortcutFor('editor.legend.link')).toBe(shortcut)
    } finally {
      platformSpy.mockRestore()
    }
  })

  it('still shows the bold shortcut', () => {
    expect(shortcutFor('editor.legend.bold')).toBe('ctrl + b')
  })
})
