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

  it('shows the link shortcut', () => {
    expect(shortcutFor('editor.legend.link')).toBe('ctrl + k')
  })

  it('still shows the bold shortcut', () => {
    expect(shortcutFor('editor.legend.bold')).toBe('ctrl + b')
  })
})
