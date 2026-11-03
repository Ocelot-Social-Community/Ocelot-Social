import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { trapFocus, useBodyScrollLock, useEscapeKey } from './dialog'

// One component that uses both composables, as a dialog does.
const Dialog = defineComponent({
  props: {
    open: Boolean,
    onEscape: { type: Function, default: () => undefined },
  },
  setup(props) {
    useBodyScrollLock(() => props.open)
    useEscapeKey(
      () => props.open,
      () => {
        ;(props.onEscape as () => void)()
      },
    )
    return () => h('div')
  },
})

const tab = (shiftKey = false) =>
  new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true })

describe(trapFocus, () => {
  const container = document.createElement('div')
  const byId = (id: string) => container.querySelector<HTMLElement>(`#${id}`) as HTMLElement

  beforeAll(() => {
    container.innerHTML =
      '<button id="first">1</button><button disabled>x</button><a href="#" id="middle">2</a><button id="last">3</button>'
    document.body.appendChild(container)
  })

  it('wraps Tab from the last element to the first', () => {
    byId('last').focus()
    const event = tab()
    trapFocus(container, event)

    expect(document.activeElement).toBe(byId('first'))
    expect(event.defaultPrevented).toBe(true)
  })

  it('wraps Shift+Tab from the first element to the last', () => {
    byId('first').focus()
    const event = tab(true)
    trapFocus(container, event)

    expect(document.activeElement).toBe(byId('last'))
    expect(event.defaultPrevented).toBe(true)
  })

  it('wraps Shift+Tab to the last element from the container itself', () => {
    // A dialog focuses its panel on open; the first Shift+Tab must not leave it.
    container.tabIndex = -1
    container.focus()
    const event = tab(true)
    trapFocus(container, event)

    expect(document.activeElement).toBe(byId('last'))
    expect(event.defaultPrevented).toBe(true)
  })

  it('lets Tab move on as usual in between', () => {
    byId('middle').focus()
    const forward = tab()
    trapFocus(container, forward)
    const backward = tab(true)
    trapFocus(container, backward)

    expect(forward.defaultPrevented).toBe(false)
    expect(backward.defaultPrevented).toBe(false)
  })

  it('ignores other keys, a missing container and one without focusable elements', () => {
    byId('last').focus()
    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    trapFocus(container, enter)
    trapFocus(null, tab())
    trapFocus(document.createElement('div'), tab())

    expect(enter.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(byId('last'))
  })
})

describe(useBodyScrollLock, () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('holds the page still while open and gives back what was there', async () => {
    document.body.style.overflow = 'auto'
    const wrapper = mount(Dialog, { props: { open: true } })

    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.setProps({ open: false })

    expect(document.body.style.overflow).toBe('auto')
  })

  it('releases on unmount, but only what it locked itself', () => {
    const open = mount(Dialog, { props: { open: true } })
    open.unmount()

    expect(document.body.style.overflow).toBe('')

    // A closed one must not overwrite somebody else's lock when it goes.
    const closed = mount(Dialog, { props: { open: false } })
    document.body.style.overflow = 'hidden'
    closed.unmount()

    expect(document.body.style.overflow).toBe('hidden')
  })
})

describe(useEscapeKey, () => {
  const press = (key: string) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }))
  }

  it('reports Escape while open, and nothing else', async () => {
    const onEscape = vi.fn<() => void>()
    const wrapper = mount(Dialog, { props: { open: true, onEscape } })
    press('Enter')
    press('Escape')

    expect(onEscape).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ open: false })
    press('Escape')

    expect(onEscape).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    press('Escape')

    expect(onEscape).toHaveBeenCalledTimes(1)
  })
})
