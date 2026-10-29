import { mount } from '@vue/test-utils'
import ThemeSwitch from './ThemeSwitch.vue'
import { iconRegistry } from '~/utils/iconRegistry'

const factory = (cookie) => {
  const $cookies = { get: jest.fn(() => cookie), set: jest.fn() }
  const wrapper = mount(ThemeSwitch, {
    mocks: { $t: (k) => k, $cookies },
    directives: { tooltip: {} },
    stubs: {
      OsButton: {
        template:
          '<button class="os" @click="$emit(\'click\', $event)"><slot name="icon" /></button>',
      },
    },
  })
  return { wrapper, $cookies }
}

describe('ThemeSwitch', () => {
  it('shows an icon per theme', () => {
    for (const theme of ['system', 'light', 'dark']) {
      expect(factory(theme).wrapper.vm.icon).toBe(
        iconRegistry[{ system: 'themeSystem', light: 'themeLight', dark: 'themeDark' }[theme]],
      )
    }
  })

  it('starts from the cookie', () => {
    expect(factory('dark').wrapper.vm.theme).toBe('dark')
    expect(factory(undefined).wrapper.vm.theme).toBe('system')
  })

  it('cycles system → light → dark → system, saves and applies each', async () => {
    const { wrapper, $cookies } = factory(undefined)
    const seen = []
    for (let i = 0; i < 3; i++) {
      await wrapper.find('button.os').trigger('click')
      seen.push(wrapper.vm.theme)
      expect(document.documentElement.getAttribute('data-theme')).toBe(wrapper.vm.theme)
    }
    expect(seen).toEqual(['light', 'dark', 'system'])
    expect($cookies.set).toHaveBeenLastCalledWith(
      'ocelot-theme',
      'system',
      expect.objectContaining({ path: '/' }),
    )
  })
})
