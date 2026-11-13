import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import OsTooltip from './OsTooltip.vue'
import { vOsTooltip } from './vOsTooltip'

import type { TooltipValue } from './types'

const tooltipElement = () => document.body.querySelector<HTMLElement>('[role="tooltip"]')
const isShown = () => tooltipElement()?.classList.contains('os-tooltip--visible') ?? false

describe('osTooltip', () => {
  let wrapper: ReturnType<typeof mount> | undefined

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.useRealTimers()
  })

  const mountTooltip = (props: Record<string, unknown> = {}) =>
    mount(OsTooltip, {
      props: { content: 'Chat with the group', ...props },
      slots: { default: () => h('button', { 'data-testid': 'tab' }, 'Group') },
      attachTo: document.body,
    })

  describe('rendering', () => {
    it('renders its slot as is, without a wrapper', () => {
      wrapper = mountTooltip()

      expect((wrapper.element as HTMLElement).tagName).toBe('BUTTON')
      expect(wrapper.text()).toBe('Group')
    })

    it('describes the slot element by the tooltip', () => {
      wrapper = mountTooltip()

      expect(wrapper.attributes('aria-describedby')).toBe(tooltipElement()?.id)
      expect(tooltipElement()?.textContent).toBe('Chat with the group')
    })

    it('renders no tooltip for an empty content', () => {
      wrapper = mountTooltip({ content: '' })

      expect(tooltipElement()).toBeNull()
      expect(wrapper.attributes('aria-describedby')).toBeUndefined()
    })

    it('passes its options on', () => {
      wrapper = mountTooltip({ multiline: true, narrow: true, html: true, content: '<b>A</b>' })

      expect(tooltipElement()?.classList).toContain('os-tooltip--multiline')
      expect(tooltipElement()?.classList).toContain('os-tooltip--narrow')
      expect(tooltipElement()?.querySelector('b')).not.toBeNull()
    })

    it('follows changed props', async () => {
      wrapper = mountTooltip()

      await wrapper.setProps({ content: 'Chat with the person' })

      expect(tooltipElement()?.textContent).toBe('Chat with the person')
    })

    it('renders nothing for an empty slot', () => {
      wrapper = mount(OsTooltip, { props: { content: 'Hint' }, attachTo: document.body })

      expect(tooltipElement()).toBeNull()
    })

    it('moves to a new slot element, and away from a text', async () => {
      const kind = ref<'button' | 'link' | 'text'>('button')
      const Host = defineComponent({
        setup: () => () =>
          h(OsTooltip, { content: 'Hint' }, () => {
            if (kind.value === 'text') {
              return 'just text'
            }
            return kind.value === 'button' ? h('button', 'A') : h('a', { href: '#' }, 'B')
          }),
      })
      wrapper = mount(Host, { attachTo: document.body })
      const firstId = tooltipElement()?.id

      kind.value = 'link'
      await nextTick()

      expect(wrapper.find('a').attributes('aria-describedby')).toBe(tooltipElement()?.id)
      expect(tooltipElement()?.id).not.toBe(firstId)
      expect(document.body.querySelectorAll('[role="tooltip"]')).toHaveLength(1)

      kind.value = 'text'
      await nextTick()

      expect(tooltipElement()).toBeNull()
    })

    it('removes the tooltip when unmounted', () => {
      wrapper = mountTooltip()

      wrapper.unmount()
      wrapper = undefined

      expect(tooltipElement()).toBeNull()
    })
  })

  describe('show', () => {
    it('shows and hides as told, with hover doing nothing', async () => {
      wrapper = mountTooltip({ show: true })

      expect(isShown()).toBe(true)

      await wrapper.trigger('mouseleave')
      vi.advanceTimersByTime(1000)

      expect(isShown()).toBe(true)

      await wrapper.setProps({ show: false })

      expect(isShown()).toBe(false)
    })

    it('leaves it to hover and focus when left out', async () => {
      wrapper = mountTooltip({ delay: 0 })

      await wrapper.trigger('mouseenter')
      vi.advanceTimersByTime(0)

      expect(isShown()).toBe(true)
    })
  })

  describe('keyboard accessibility', () => {
    it('shows on keyboard focus and hides on Esc', async () => {
      wrapper = mountTooltip()
      vi.spyOn(wrapper.element as HTMLElement, 'matches').mockReturnValue(true)

      await wrapper.trigger('focusin')
      vi.advanceTimersByTime(750)

      expect(isShown()).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(isShown()).toBe(false)
    })

    it('hides on blur', async () => {
      wrapper = mountTooltip()
      vi.spyOn(wrapper.element as HTMLElement, 'matches').mockReturnValue(true)
      await wrapper.trigger('focusin')
      vi.advanceTimersByTime(750)

      await wrapper.trigger('focusout')
      vi.advanceTimersByTime(50)

      expect(isShown()).toBe(false)
    })
  })
})

describe('vOsTooltip', () => {
  let wrapper: ReturnType<typeof mount> | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  const mountWith = (value: TooltipValue) => {
    const current = ref(value)
    wrapper = mount(
      {
        directives: { osTooltip: vOsTooltip },
        setup: () => ({ current }),
        template: '<button v-os-tooltip="current">Delete</button>',
      },
      { attachTo: document.body },
    )
    return current
  }

  it('takes the text alone', () => {
    mountWith('Delete the post')

    expect(tooltipElement()?.textContent).toBe('Delete the post')
    expect(wrapper?.attributes('aria-describedby')).toBe(tooltipElement()?.id)
  })

  it('takes options', () => {
    mountWith({ content: 'Delete the post', narrow: true })

    expect(tooltipElement()?.classList).toContain('os-tooltip--narrow')
  })

  it('follows a changed value', async () => {
    const current = mountWith('Delete the post')

    current.value = 'Remove the post'
    await nextTick()

    expect(tooltipElement()?.textContent).toBe('Remove the post')
  })

  it('removes the tooltip with the element', () => {
    mountWith('Delete the post')

    wrapper?.unmount()
    wrapper = undefined

    expect(tooltipElement()).toBeNull()
  })

  it('carries the hooks of both Vue versions', () => {
    expect(vOsTooltip.inserted).toBe(vOsTooltip.mounted)
    expect(vOsTooltip.componentUpdated).toBe(vOsTooltip.updated)
    expect(vOsTooltip.unbind).toBe(vOsTooltip.unmounted)
  })
})
