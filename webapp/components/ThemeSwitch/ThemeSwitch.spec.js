import { mount } from '@vue/test-utils'
import ThemeSwitch from './ThemeSwitch.vue'
import { iconRegistry } from '~/utils/iconRegistry'

const factory = (cookie, propsData = {}) => {
  const $cookies = { get: jest.fn(() => cookie), set: jest.fn() }
  const wrapper = mount(ThemeSwitch, {
    propsData,
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

  describe('as a menu row', () => {
    it('shows the theme in words, and the whole row switches it', async () => {
      const { wrapper, $cookies } = factory('light', { row: true })
      expect(wrapper.find('[role="button"]').text()).toBe('themeSwitch.light')
      await wrapper.find('[role="button"]').trigger('click')
      expect(wrapper.vm.theme).toBe('dark')
      expect(wrapper.find('[role="button"]').text()).toBe('themeSwitch.dark')
      expect($cookies.set).toHaveBeenCalledWith(
        'ocelot-theme',
        'dark',
        expect.objectContaining({ path: '/' }),
      )
    })

    it('switches by keyboard, too', async () => {
      const { wrapper } = factory('light', { row: true })
      await wrapper.find('[role="button"]').trigger('keydown.enter')
      expect(wrapper.vm.theme).toBe('dark')
      await wrapper.find('[role="button"]').trigger('keydown.space')
      expect(wrapper.vm.theme).toBe('system')
    })

    it('is only the round icon button without the prop', () => {
      expect(factory('light').wrapper.find('[role="button"]').exists()).toBe(false)
      expect(factory('light').wrapper.find('button.os').exists()).toBe(true)
    })
  })

  describe('two switches in one page', () => {
    const pair = () => {
      const $cookies = { get: jest.fn(() => 'light'), set: jest.fn() }
      const Parent = {
        components: { ThemeSwitch },
        template: '<div><theme-switch ref="a" /><theme-switch ref="b" row /></div>',
      }
      const wrapper = mount(Parent, {
        mocks: { $t: (k) => k, $cookies },
        directives: { tooltip: {} },
        stubs: {
          OsButton: {
            template:
              '<button class="os" @click="$emit(\'click\', $event)"><slot name="icon" /></button>',
          },
        },
      })
      return wrapper
    }

    it('shows the theme the other one set', async () => {
      const wrapper = pair()
      await wrapper.find('button.os').trigger('click')
      expect(wrapper.vm.$refs.a.theme).toBe('dark')
      expect(wrapper.vm.$refs.b.theme).toBe('dark')
      await wrapper.find('[role="button"]').trigger('click')
      expect(wrapper.vm.$refs.a.theme).toBe('system')
      expect(wrapper.vm.$refs.b.theme).toBe('system')
    })

    it('stops listening once it is gone', () => {
      const wrapper = pair()
      const b = wrapper.vm.$refs.b
      const off = jest.spyOn(wrapper.vm.$root, '$off')
      b.$destroy()
      expect(off).toHaveBeenCalledWith('ocelot-theme-changed', b.follow)
    })
  })
})
