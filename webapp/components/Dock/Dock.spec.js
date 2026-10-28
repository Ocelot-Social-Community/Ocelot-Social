import { mount } from '@vue/test-utils'
import Dock, { RAIL_MEDIA_QUERY } from './Dock.vue'
import registry from './modules'

const localVue = global.localVue

// A stand-in module with two links; its count is reported through the dock's handler.
const Reporter = {
  name: 'Reporter',
  render(h) {
    return h('div', { class: 'reporter', attrs: { 'data-dock-align': '' } }, [
      h('a', { attrs: { href: '#a' } }, 'a'),
      h('a', { attrs: { href: '#b' } }, 'b'),
    ])
  },
}

const moduleOn = (id, side = 'right', routes = ['*']) => ({
  id,
  side,
  icon: 'videoCamera',
  routes,
  component: Reporter,
  enabled: () => true,
})

let mediaQuery
const mockMatchMedia = (matches) => {
  const listeners = []
  mediaQuery = {
    matches,
    addEventListener: jest.fn((_type, listener) => listeners.push(listener)),
    removeEventListener: jest.fn(),
    fire: (next) => listeners.forEach((listener) => listener({ matches: next })),
  }
  window.matchMedia = jest.fn(() => mediaQuery)
}

describe('Dock.vue', () => {
  let route

  const Wrapper = ({ side = 'right', registry = [moduleOn('calls')] } = {}) =>
    mount(Dock, {
      localVue,
      propsData: { side, registry },
      mocks: {
        $t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
        $route: route,
        $store: {},
      },
      attachTo: document.body,
    })

  const report = async (wrapper, id, count) => {
    wrapper.vm.setCount(id, count)
    await wrapper.vm.$nextTick()
  }

  beforeEach(() => {
    route = { name: 'index' }
    mockMatchMedia(false)
  })

  it('takes its modules from the registry', () => {
    const wrapper = mount(Dock, {
      localVue,
      propsData: { side: 'left' },
      mocks: { $t: (key) => key, $route: route, $store: {} },
    })
    expect(wrapper.vm.registry).toBe(registry)
  })

  it('sits on the left or the right', () => {
    const { validator } = Dock.props.side
    expect(['left', 'right'].map(validator)).toEqual([true, true])
    expect(validator('top')).toBe(false)
  })

  it('renders nothing on a page without modules for its side', () => {
    const wrapper = Wrapper({ registry: [moduleOn('calls', 'left')] })
    expect(wrapper.find('[data-test="dock"]').exists()).toBe(false)
  })

  it('takes no room while its modules show nothing, but keeps them mounted', () => {
    const wrapper = Wrapper()
    expect(wrapper.find('[data-test="dock"]').attributes('hidden')).toBe('hidden')
    expect(wrapper.find('.reporter').exists()).toBe(true)
  })

  it('asks for the rail layout once, and stops listening when it goes', () => {
    const wrapper = Wrapper()
    expect(window.matchMedia).toHaveBeenCalledWith(RAIL_MEDIA_QUERY)
    wrapper.destroy()
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  describe('on a narrow screen', () => {
    it('shows a flag with the sum of what its modules show', async () => {
      const wrapper = Wrapper({ registry: [moduleOn('a'), moduleOn('b')] })
      await report(wrapper, 'a', 2)
      await report(wrapper, 'b', 1)

      const flag = wrapper.find('[data-test="dock-flag"]')
      expect(wrapper.find('[data-test="dock"]').attributes('hidden')).toBeUndefined()
      expect(flag.text()).toBe('3')
      // One icon per module that shows something: you see what is in there.
      expect(flag.findAllComponents({ name: 'OsIcon' })).toHaveLength(2)
      expect(flag.attributes('aria-label')).toBe('dock.open {"count":3}')
      expect(flag.attributes('aria-expanded')).toBe('false')

      await report(wrapper, 'b', 0)
      expect(
        wrapper.find('[data-test="dock-flag"]').findAllComponents({ name: 'OsIcon' }),
      ).toHaveLength(1)
    })

    it('opens the drawer as a modal dialog and focuses it', async () => {
      const wrapper = Wrapper()
      await report(wrapper, 'calls', 1)

      await wrapper.find('[data-test="dock-flag"]').trigger('click')
      await wrapper.vm.$nextTick()

      const panel = wrapper.find('aside')
      expect(wrapper.classes()).toContain('dock--open')
      expect(wrapper.find('[data-test="dock-flag"]').attributes('aria-expanded')).toBe('true')
      expect(panel.attributes('role')).toBe('dialog')
      expect(panel.attributes('aria-modal')).toBe('true')
      expect(document.activeElement).toBe(panel.element)
    })

    it.each([
      ['the flag', (wrapper) => wrapper.find('[data-test="dock-flag"]').trigger('click')],
      ['the backdrop', (wrapper) => wrapper.find('[data-test="dock-backdrop"]').trigger('click')],
      ['the close button', (wrapper) => wrapper.find('[data-test="dock-close"]').trigger('click')],
      ['Escape', (wrapper) => wrapper.find('aside').trigger('keydown', { key: 'Escape' })],
    ])('closes on %s and gives the focus back to the flag', async (_name, act) => {
      const wrapper = Wrapper()
      await report(wrapper, 'calls', 1)
      await wrapper.find('[data-test="dock-flag"]').trigger('click')

      await act(wrapper)
      await wrapper.vm.$nextTick()

      expect(wrapper.classes()).not.toContain('dock--open')
      expect(document.activeElement).toBe(wrapper.find('[data-test="dock-flag"]').element)
    })

    it('closes when its modules have nothing left to show', async () => {
      const wrapper = Wrapper()
      await report(wrapper, 'calls', 1)
      await wrapper.find('[data-test="dock-flag"]').trigger('click')

      await report(wrapper, 'calls', 0)

      expect(wrapper.vm.open).toBe(false)
    })

    it('closes on navigation', async () => {
      const wrapper = Wrapper()
      await report(wrapper, 'calls', 1)
      await wrapper.find('[data-test="dock-flag"]').trigger('click')

      wrapper.vm.$options.watch.$route.call(wrapper.vm)

      expect(wrapper.vm.open).toBe(false)
    })

    it('keeps the focus inside the open drawer', async () => {
      const wrapper = Wrapper()
      await report(wrapper, 'calls', 1)
      await wrapper.find('[data-test="dock-flag"]').trigger('click')
      const panel = wrapper.find('aside')
      const focusable = panel.findAll('button, a')
      const first = focusable.at(0).element
      const last = focusable.at(focusable.length - 1).element

      last.focus()
      await panel.trigger('keydown', { key: 'Tab' })
      expect(document.activeElement).toBe(first)

      first.focus()
      await panel.trigger('keydown', { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(last)

      // In between, Tab moves on as usual.
      focusable.at(1).element.focus()
      await panel.trigger('keydown', { key: 'Tab' })
      expect(document.activeElement).toBe(focusable.at(1).element)
      await panel.trigger('keydown', { key: 'Enter' })
      expect(wrapper.vm.open).toBe(true)
    })

    it('ignores keys while closed', async () => {
      const wrapper = Wrapper()
      await report(wrapper, 'calls', 1)
      await wrapper.find('aside').trigger('keydown', { key: 'Escape' })
      expect(wrapper.vm.open).toBe(false)
    })
  })

  describe('on a wide screen', () => {
    beforeEach(() => mockMatchMedia(true))

    it('is a rail beside the content, without flag or dialog', async () => {
      const wrapper = Wrapper()
      await report(wrapper, 'calls', 1)

      expect(wrapper.classes()).toContain('dock--rail')
      expect(wrapper.find('[data-test="dock-flag"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="dock-close"]').exists()).toBe(false)
      expect(wrapper.find('aside').attributes('role')).toBeUndefined()
    })

    it('folds into the flag when the screen gets narrow, and back', async () => {
      mockMatchMedia(false)
      const wrapper = Wrapper()
      await report(wrapper, 'calls', 1)
      await wrapper.find('[data-test="dock-flag"]').trigger('click')

      mediaQuery.fire(true)
      await wrapper.vm.$nextTick()
      expect(wrapper.classes()).toContain('dock--rail')
      expect(wrapper.vm.open).toBe(false)

      mediaQuery.fire(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.classes()).toContain('dock--drawer')
    })
  })

  it('counts what a module reports through its count event', async () => {
    const wrapper = Wrapper()
    wrapper.findComponent(Reporter).vm.$emit('count', 4)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="dock-flag"]').text()).toBe('4')
  })

  it('forgets the count of a module that left with the page', async () => {
    const wrapper = Wrapper({ registry: [moduleOn('calls', 'right', ['index'])] })
    await report(wrapper, 'calls', 2)

    // As if the page changed: the module no longer matches.
    await wrapper.setProps({ registry: [moduleOn('calls', 'right', ['groups'])] })

    expect(wrapper.vm.counts).toEqual({})
  })

  describe('lining up with the page content', () => {
    let anchor, observer

    const rectTop = (element, top) => {
      element.getBoundingClientRect = () => ({ top })
    }
    const WideWrapper = async () => {
      mockMatchMedia(true)
      const wrapper = Wrapper()
      // jsdom does no layout: no offsetParent, every rect at 0.
      const layout = document.createElement('div')
      rectTop(layout, 10)
      Object.defineProperty(wrapper.element, 'offsetParent', { value: layout, configurable: true })
      rectTop(wrapper.find('aside').element, 100)
      rectTop(wrapper.find('[data-dock-align]').element, 140)
      await report(wrapper, 'calls', 1)
      await wrapper.vm.$nextTick()
      return wrapper
    }

    beforeEach(() => {
      anchor = document.createElement('div')
      anchor.setAttribute('data-dock-anchor', '')
      rectTop(anchor, 310)
      document.body.appendChild(anchor)
      window.ResizeObserver = jest.fn(function (callback) {
        observer = { callback, observe: jest.fn(), disconnect: jest.fn() }
        return observer
      })
    })

    afterEach(() => {
      anchor.remove()
      delete window.ResizeObserver
    })

    it('starts its first list where the page content starts, the heading above it', async () => {
      const wrapper = await WideWrapper()
      // anchor 300 below the layout's top, minus the 40 the heading takes
      expect(wrapper.vm.top).toBe(260)
      expect(wrapper.attributes('style')).toContain('top: 260px')
    })

    it('looks again whenever the page changes its size', async () => {
      const wrapper = await WideWrapper()
      expect(observer.observe).toHaveBeenCalledWith(document.body)

      rectTop(anchor, 410)
      observer.callback()

      expect(wrapper.vm.top).toBe(360)
      wrapper.destroy()
      expect(observer.disconnect).toHaveBeenCalled()
    })

    it('keeps its default place on a page without an anchor', async () => {
      anchor.remove()
      const wrapper = await WideWrapper()
      expect(wrapper.vm.top).toBeNull()
      expect(wrapper.attributes('style')).toBeUndefined()
    })

    it('starts the flag where the page content starts', async () => {
      const wrapper = Wrapper()
      const layout = document.createElement('div')
      rectTop(layout, 10)
      Object.defineProperty(wrapper.element, 'offsetParent', { value: layout, configurable: true })
      await report(wrapper, 'calls', 1)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.top).toBe(300)
      expect(wrapper.attributes('style')).toContain('top: 300px')
    })

    it('keeps the default place while the dock is not laid out', async () => {
      // A hidden dock has no offsetParent.
      const wrapper = Wrapper()
      await report(wrapper, 'calls', 1)
      expect(wrapper.vm.top).toBeNull()
    })

    it('keeps the default place while no module marks where its content starts', async () => {
      const wrapper = await WideWrapper()
      wrapper.find('[data-dock-align]').element.removeAttribute('data-dock-align')
      wrapper.vm.align()
      expect(wrapper.vm.top).toBeNull()
    })

    it('does without a ResizeObserver', async () => {
      delete window.ResizeObserver
      const wrapper = await WideWrapper()
      expect(wrapper.vm.top).toBe(260)
      expect(() => wrapper.destroy()).not.toThrow()
    })
  })
})
