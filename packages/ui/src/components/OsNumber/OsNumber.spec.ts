import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import OsNumber from './OsNumber.vue'

describe('osNumber', () => {
  let rafCallbacks: ((time: number) => void)[]
  let mockTime: number

  beforeEach(() => {
    rafCallbacks = []
    mockTime = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      // eslint-disable-next-line promise/prefer-await-to-callbacks
      (cb) => {
        rafCallbacks.push(cb)
        return rafCallbacks.length
      },
    )
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    vi.spyOn(performance, 'now').mockImplementation(() => mockTime)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function flushAnimation() {
    mockTime += 1500
    let safety = 0
    while (rafCallbacks.length > 0 && safety++ < 100) {
      const fn = rafCallbacks.shift() as (time: number) => void
      fn(mockTime)
    }
  }

  describe('rendering', () => {
    it('renders as div element', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
      })

      expect((wrapper.element as HTMLElement).tagName).toBe('DIV')
    })

    it('has os-number class', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
      })

      expect(wrapper.classes()).toContain('os-number')
    })

    it('displays count as text', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 42 },
      })

      expect(wrapper.find('.os-number-count').text()).toBe('42')
    })

    it('displays 0 when count is 0', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
      })

      expect(wrapper.find('.os-number-count').text()).toBe('0')
    })
  })

  describe('label', () => {
    it('shows label when set', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0, label: 'Followers' },
      })

      expect(wrapper.find('.os-number-label').exists()).toBe(true)
      expect(wrapper.find('.os-number-label').text()).toBe('Followers')
    })

    it('hides label when not set', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
      })

      expect(wrapper.find('.os-number-label').exists()).toBe(false)
    })
  })

  describe('css', () => {
    it('merges custom classes', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
        attrs: { class: 'my-custom-class' },
      })

      expect(wrapper.classes()).toContain('os-number')
      expect(wrapper.classes()).toContain('my-custom-class')
    })

    it('passes through attributes', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
        attrs: { 'data-testid': 'my-number' },
      })

      expect(wrapper.attributes('data-testid')).toBe('my-number')
    })

    it('applies count styling classes', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 42 },
      })

      expect(wrapper.find('.os-number-count').classes()).toContain('font-bold')
      expect(wrapper.find('.os-number-count').classes()).toContain('text-[1.5rem]')
    })

    it('applies label styling classes', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0, label: 'Test' },
      })

      expect(wrapper.find('.os-number-label').classes()).toContain('text-[12px]')
      expect(wrapper.find('.os-number-label').classes()).toContain('text-[var(--color-text-soft)]')
    })
  })

  describe('animation', () => {
    it('starts at 0 when animated is true', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 100, animated: true },
      })

      expect(wrapper.find('.os-number-count').text()).toBe('0')
    })

    it('animates to target value after mount', async () => {
      const wrapper = mount(OsNumber, {
        props: { count: 100, animated: true },
      })

      flushAnimation()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.os-number-count').text()).toBe('100')
    })

    it('re-animates when count changes', async () => {
      const wrapper = mount(OsNumber, {
        props: { count: 50, animated: true },
      })

      flushAnimation()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.os-number-count').text()).toBe('50')

      await wrapper.setProps({ count: 100 })
      flushAnimation()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.os-number-count').text()).toBe('100')
    })

    it('shows intermediate value during animation', async () => {
      const wrapper = mount(OsNumber, {
        props: { count: 100, animated: true },
      })

      mockTime += 750
      const fn = rafCallbacks.shift() as (time: number) => void
      fn(mockTime)
      await wrapper.vm.$nextTick()

      const intermediate = Number(wrapper.find('.os-number-count').text())

      expect(intermediate).toBeGreaterThan(0)
      expect(intermediate).toBeLessThan(100)
    })

    it('updates value directly when not animated', async () => {
      const wrapper = mount(OsNumber, {
        props: { count: 50, animated: false },
      })

      expect(wrapper.find('.os-number-count').text()).toBe('50')

      await wrapper.setProps({ count: 100 })

      expect(wrapper.find('.os-number-count').text()).toBe('100')
    })

    it('cancels previous animation when count changes rapidly', async () => {
      const wrapper = mount(OsNumber, {
        props: { count: 50, animated: true },
      })

      // First animation starts on mount
      expect(window.requestAnimationFrame).toHaveBeenCalledWith(expect.any(Function))

      await wrapper.setProps({ count: 200 })

      expect(window.cancelAnimationFrame).toHaveBeenCalledWith(expect.any(Number))

      flushAnimation()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.os-number-count').text()).toBe('200')
    })
  })

  describe('keyboard accessibility', () => {
    it('is not focusable (non-interactive element)', () => {
      const wrapper = mount(OsNumber, {
        props: { count: 0 },
      })

      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })
  })
})
