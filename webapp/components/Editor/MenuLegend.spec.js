import { mount } from '@vue/test-utils'
import MenuLegend from './MenuLegend'

const localVue = global.localVue

// Renders the legend's popover right away instead of on a click.
const Dropdown = {
  template: '<div><slot :toggleMenu="() => {}" /><slot name="popover" /></div>',
}

describe('MenuLegend.vue', () => {
  let wrapper

  const shortcutFor = (name) =>
    wrapper
      .findAll('.legend-table')
      .filter((row) => row.text().includes(name))
      .at(0)
      .find('.tool-shortcut')
      .text()

  it.each([
    ['Win32', 'ctrl'],
    ['MacIntel', 'cmd'],
    ['iPhone', 'cmd'],
    ['iPad', 'cmd'],
    ['iPod', 'cmd'],
    ['Linux x86_64', 'ctrl'],
  ])('shows correct shortcuts on %s', (platform, modifier) => {
    const platformSpy = jest.spyOn(window.navigator, 'platform', 'get').mockReturnValue(platform)

    try {
      wrapper = mount(MenuLegend, {
        mocks: { $t: (key) => key },
        localVue,
        stubs: { Dropdown },
      })

      expect(shortcutFor('editor.legend.bold')).toBe(`${modifier} + b`)
      expect(shortcutFor('editor.legend.italic')).toBe(`${modifier} + i`)
      expect(shortcutFor('editor.legend.underline')).toBe(`${modifier} + u`)
      expect(shortcutFor('editor.legend.link')).toBe(`${modifier} + k`)
    } finally {
      platformSpy.mockRestore()
    }
  })
})
