import { mount } from '@vue/test-utils'
import AreaMenu from './AreaMenu'

const localVue = global.localVue

// Named stub so we can assert which props AreaMenu forwards to the sidebar menu.
const OsMenuStub = {
  name: 'OsMenu',
  props: ['routes', 'matcher', 'isExact', 'linkTag'],
  render(h) {
    return h('nav', { class: 'os-menu-stub' })
  },
}

describe('AreaMenu', () => {
  let mocks, propsData, wrapper
  const stubs = { 'os-menu': OsMenuStub }
  const Wrapper = () => mount(AreaMenu, { mocks, localVue, propsData, stubs })

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key) => key),
      $route: { path: '/admin/users' },
      $router: { push: jest.fn() },
    }
    propsData = {
      routes: [
        { name: 'Dashboard', path: '/admin' },
        { name: 'Users', path: '/admin/users' },
      ],
      ariaLabel: 'Administration',
    }
    wrapper = Wrapper()
  })

  describe('select dropdown (narrow viewport)', () => {
    it('renders one option per route', () => {
      const options = wrapper.findAll('[data-test="area-menu-select"] option')
      expect(options).toHaveLength(2)
      expect(options.at(0).text()).toBe('Dashboard')
      expect(options.at(1).text()).toBe('Users')
    })

    it('reflects the current route as the selected value', () => {
      expect(wrapper.find('[data-test="area-menu-select"]').element.value).toBe('/admin/users')
    })

    it('exposes the aria-label', () => {
      expect(wrapper.find('[data-test="area-menu-select"]').attributes('aria-label')).toBe(
        'Administration',
      )
    })

    it('navigates to the chosen route on change', () => {
      const select = wrapper.find('[data-test="area-menu-select"]')
      select.element.value = '/admin'
      select.trigger('change')
      expect(mocks.$router.push).toHaveBeenCalledWith('/admin')
    })
  })

  describe('sidebar menu (wide viewport)', () => {
    it('forwards routes to OsMenu', () => {
      expect(wrapper.findComponent(OsMenuStub).props('routes')).toEqual(propsData.routes)
    })

    it('defaults linkTag to router-link', () => {
      expect(wrapper.findComponent(OsMenuStub).props('linkTag')).toBe('router-link')
    })

    it('forwards matcher and isExact when provided', () => {
      const matcher = jest.fn()
      const isExact = jest.fn()
      propsData = { ...propsData, matcher, isExact }
      wrapper = Wrapper()
      expect(wrapper.findComponent(OsMenuStub).props('matcher')).toBe(matcher)
      expect(wrapper.findComponent(OsMenuStub).props('isExact')).toBe(isExact)
    })

    it('leaves matcher and isExact undefined by default so OsMenu applies its own', () => {
      expect(wrapper.findComponent(OsMenuStub).props('matcher')).toBeUndefined()
      expect(wrapper.findComponent(OsMenuStub).props('isExact')).toBeUndefined()
    })
  })
})
