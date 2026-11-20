import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTooltip, normalizeTooltipValue } from './tooltip'

import type { Tooltip } from './tooltip'
import type { TooltipValue } from './types'

describe(normalizeTooltipValue, () => {
  it('reads a string as the content', () => {
    expect(normalizeTooltipValue('Delete')).toStrictEqual({ content: 'Delete' })
  })

  it('reads null and undefined as no options', () => {
    expect(normalizeTooltipValue(null)).toStrictEqual({})
    expect(normalizeTooltipValue(undefined)).toStrictEqual({})
  })

  it('passes options through', () => {
    const options = { content: 'Delete', placement: 'left' as const }

    expect(normalizeTooltipValue(options)).toBe(options)
  })
})

describe(createTooltip, () => {
  let reference: HTMLButtonElement
  let tooltip: Tooltip | undefined

  const attach = (value: TooltipValue) => {
    tooltip = createTooltip(reference, value)
    return tooltip
  }
  const tooltipElement = () => document.body.querySelector<HTMLElement>('[role="tooltip"]')
  const isShown = () => tooltipElement()?.classList.contains('os-tooltip--visible') ?? false
  const fire = (target: EventTarget, type: string) => target.dispatchEvent(new Event(type))

  beforeEach(() => {
    vi.useFakeTimers()
    reference = document.createElement('button')
    document.body.append(reference)
  })

  afterEach(() => {
    tooltip?.destroy()
    tooltip = undefined
    reference.remove()
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('puts a hidden tooltip under <body> that the element is described by', () => {
      attach('Delete')

      const el = tooltipElement()

      expect(el?.parentElement).toBe(document.body)
      expect(el?.id).toMatch(/^os-tooltip-\d+$/)
      expect(el?.textContent).toBe('Delete')
      expect(reference.getAttribute('aria-describedby')).toBe(el?.id)
      expect(isShown()).toBe(false)
    })

    it('gives each tooltip its own id', () => {
      attach('One')
      const other = document.createElement('button')
      const second = createTooltip(other, 'Two')

      expect(other.getAttribute('aria-describedby')).not.toBe(
        reference.getAttribute('aria-describedby'),
      )

      second.destroy()
    })

    it('keeps the ids the element was already described by', () => {
      reference.setAttribute('aria-describedby', 'hint')
      attach('Delete')

      const { id } = tooltipElement() as HTMLElement

      expect(reference.getAttribute('aria-describedby')).toBe(`hint ${id}`)

      tooltip?.destroy()
      tooltip = undefined

      expect(reference.getAttribute('aria-describedby')).toBe('hint')
    })

    it.each([[''], ['   '], [null], [undefined], [{}], [{ content: null }]])(
      'renders nothing for %j',
      (value) => {
        attach(value)

        expect(tooltipElement()).toBeNull()
        expect(reference.hasAttribute('aria-describedby')).toBe(false)
      },
    )

    it('sets the content as plain text by default', () => {
      attach('<b>Mic</b>')

      const inner = tooltipElement()?.querySelector('.os-tooltip-inner')

      expect(inner?.textContent).toBe('<b>Mic</b>')
      expect(inner?.querySelector('b')).toBeNull()
    })

    it('reads the content as HTML when asked to', () => {
      attach({ content: '<b>Mic</b>', html: true })

      expect(tooltipElement()?.querySelector('.os-tooltip-inner b')?.textContent).toBe('Mic')
    })

    it('has an arrow', () => {
      attach('Delete')

      expect(tooltipElement()?.querySelector('.os-tooltip-arrow')).not.toBeNull()
    })

    it.each([
      [{ multiline: true }, ['os-tooltip--multiline']],
      [{ narrow: true }, ['os-tooltip--narrow']],
      [{ classes: 'extra' }, ['extra']],
      [{ classes: ['one', 'two'] }, ['one', 'two']],
    ])('sets the classes for %j', (options, classes) => {
      attach({ content: 'Delete', ...options })

      expect(tooltipElement()?.classList).toContain('os-tooltip')

      for (const name of classes) {
        expect(tooltipElement()?.classList).toContain(name)
      }
    })
  })

  describe('hover', () => {
    it('shows after 750 ms and hides 50 ms after leaving', () => {
      attach('Delete')

      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(749)

      expect(isShown()).toBe(false)

      vi.advanceTimersByTime(1)

      expect(isShown()).toBe(true)

      fire(reference, 'mouseleave')
      vi.advanceTimersByTime(49)

      expect(isShown()).toBe(true)

      vi.advanceTimersByTime(1)

      expect(isShown()).toBe(false)
    })

    it('does not show when the pointer leaves before the delay is over', () => {
      attach('Delete')

      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(500)
      fire(reference, 'mouseleave')
      vi.advanceTimersByTime(1000)

      expect(isShown()).toBe(false)
    })

    it('stays when the pointer comes back in time', () => {
      attach('Delete')
      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(750)

      fire(reference, 'mouseleave')
      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(1000)

      expect(isShown()).toBe(true)
    })

    it('stays while the pointer is on the tooltip itself', () => {
      attach('Delete')
      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(750)

      fire(reference, 'mouseleave')
      fire(tooltipElement() as HTMLElement, 'mouseenter')
      vi.advanceTimersByTime(1000)

      expect(isShown()).toBe(true)

      fire(tooltipElement() as HTMLElement, 'mouseleave')
      vi.advanceTimersByTime(50)

      expect(isShown()).toBe(false)
    })

    it('takes one delay for both', () => {
      attach({ content: 'Delete', delay: 100 })

      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(100)

      expect(isShown()).toBe(true)

      fire(reference, 'mouseleave')
      vi.advanceTimersByTime(99)

      expect(isShown()).toBe(true)

      vi.advanceTimersByTime(1)

      expect(isShown()).toBe(false)
    })

    it('takes separate delays, the default for one left out', () => {
      attach({ content: 'Delete', delay: { show: 0 } })

      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(0)

      expect(isShown()).toBe(true)

      fire(reference, 'mouseleave')
      vi.advanceTimersByTime(49)

      expect(isShown()).toBe(true)
    })

    it('hides at once on a click, and does not come up after it', () => {
      attach('Delete')
      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(750)

      fire(reference, 'click')

      expect(isShown()).toBe(false)

      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(100)
      fire(reference, 'click')
      vi.advanceTimersByTime(1000)

      expect(isShown()).toBe(false)
    })
  })

  describe('keyboard accessibility', () => {
    const focusFrom = (keyboard: boolean) => {
      vi.spyOn(reference, 'matches').mockReturnValue(keyboard)
      fire(reference, 'focusin')
    }

    it('shows on keyboard focus and hides on blur', () => {
      attach('Delete')

      focusFrom(true)
      vi.advanceTimersByTime(750)

      expect(isShown()).toBe(true)
      expect(reference.matches).toHaveBeenCalledWith(':focus-visible')

      fire(reference, 'focusout')
      vi.advanceTimersByTime(50)

      expect(isShown()).toBe(false)
    })

    it('does not show on the focus a click gives', () => {
      attach('Delete')

      focusFrom(false)
      vi.advanceTimersByTime(1000)

      expect(isShown()).toBe(false)
    })

    it('hides at once on Esc', () => {
      attach('Delete')
      focusFrom(true)
      vi.advanceTimersByTime(750)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

      expect(isShown()).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(isShown()).toBe(false)
    })
  })

  describe('manual trigger', () => {
    it('follows `show`, not hover and focus', () => {
      const instance = attach({ content: 'Leave', trigger: 'manual', show: true })

      expect(isShown()).toBe(true)

      fire(reference, 'mouseleave')
      fire(reference, 'focusout')
      fire(reference, 'click')
      vi.advanceTimersByTime(1000)

      expect(isShown()).toBe(true)

      instance.update({ content: 'Leave', trigger: 'manual', show: false })

      expect(isShown()).toBe(false)

      fire(reference, 'mouseenter')
      vi.spyOn(reference, 'matches').mockReturnValue(true)
      fire(reference, 'focusin')
      vi.advanceTimersByTime(1000)

      expect(isShown()).toBe(false)
    })

    it('keeps the tooltip when the pointer leaves it', () => {
      attach({ content: 'Leave', trigger: 'manual', show: true })

      fire(tooltipElement() as HTMLElement, 'mouseleave')
      vi.advanceTimersByTime(1000)

      expect(isShown()).toBe(true)
    })

    it('stays shown when told to show again', () => {
      const instance = attach({ content: 'Leave', trigger: 'manual', show: true })

      instance.update({ content: 'Stay', trigger: 'manual', show: true })

      expect(isShown()).toBe(true)
      expect(tooltipElement()?.textContent).toBe('Stay')
    })

    it('hands back to hover and focus, starting hidden', () => {
      const instance = attach({ content: 'Leave', trigger: 'manual', show: true })

      instance.update('Leave')

      expect(isShown()).toBe(false)

      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(750)

      expect(isShown()).toBe(true)
    })
  })

  describe('update', () => {
    it('changes the content in place', () => {
      const instance = attach('Delete')
      const el = tooltipElement()

      instance.update({ content: 'Remove', narrow: true })

      expect(tooltipElement()).toBe(el)
      expect(el?.textContent).toBe('Remove')
      expect(el?.classList).toContain('os-tooltip--narrow')
    })

    it('leaves the text alone when it has not changed', () => {
      const instance = attach('Delete')
      const text = tooltipElement()?.querySelector('.os-tooltip-inner')?.firstChild

      instance.update('Delete')

      expect(tooltipElement()?.querySelector('.os-tooltip-inner')?.firstChild).toBe(text)
    })

    it('stays shown through a change while shown', () => {
      const instance = attach('Delete')
      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(750)

      instance.update('Remove')

      expect(isShown()).toBe(true)
    })

    it('removes the tooltip while the content is empty, and brings it back', () => {
      const instance = attach('Delete')
      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(750)

      instance.update('')

      expect(tooltipElement()).toBeNull()
      expect(reference.hasAttribute('aria-describedby')).toBe(false)

      fire(reference, 'mouseleave')
      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(1000)

      expect(tooltipElement()).toBeNull()

      instance.update('Remove')

      expect(tooltipElement()?.textContent).toBe('Remove')
      expect(reference.getAttribute('aria-describedby')).toBe(tooltipElement()?.id)
    })
  })

  describe('positioning', () => {
    it('places the tooltip and its arrow, and names the side it ended up on', async () => {
      attach({ content: 'Delete', placement: 'bottom' })

      fire(reference, 'mouseenter')
      await vi.advanceTimersByTimeAsync(750)

      const el = tooltipElement() as HTMLElement

      expect(el.getAttribute('data-placement')).toBe('bottom')
      expect(el.style.left).toMatch(/px$/)
      expect(el.style.top).toMatch(/px$/)
      // Above or below, the arrow moves along the edge only.
      expect((el.querySelector('.os-tooltip-arrow') as HTMLElement).style.top).toBe('')
    })

    it('places above by default', async () => {
      attach('Delete')

      fire(reference, 'mouseenter')
      await vi.advanceTimersByTimeAsync(750)

      expect(tooltipElement()?.getAttribute('data-placement')).toBe('top')
    })

    it('moves the arrow along the side edge for a tooltip at the side', async () => {
      attach({ content: 'Delete', placement: 'right' })

      fire(reference, 'mouseenter')
      await vi.advanceTimersByTimeAsync(750)

      const arrowElement = tooltipElement()?.querySelector('.os-tooltip-arrow') as HTMLElement

      expect(arrowElement.style.left).toBe('')
      expect(arrowElement.style.top).toMatch(/px$/)
    })

    it('does nothing when the tooltip went while it was being measured', async () => {
      const instance = attach({ content: 'Delete', trigger: 'manual', show: true })

      instance.destroy()
      tooltip = undefined
      await vi.advanceTimersByTimeAsync(0)

      expect(tooltipElement()).toBeNull()
    })
  })

  describe('destroy', () => {
    it('removes the tooltip and stops listening', () => {
      const instance = attach('Delete')

      instance.destroy()
      tooltip = undefined
      fire(reference, 'mouseenter')
      vi.advanceTimersByTime(1000)

      expect(tooltipElement()).toBeNull()
      expect(reference.hasAttribute('aria-describedby')).toBe(false)
    })
  })
})
