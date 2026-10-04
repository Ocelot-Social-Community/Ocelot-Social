import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'

import OsToggleGroup from './OsToggleGroup.vue'

import type { ToggleGroupOption } from './types'

const OPTIONS: ToggleGroupOption[] = [
  { value: 'public', label: 'Public', attrs: { 'data-testid': 'option-public' } },
  { value: 'closed', label: 'Closed', attrs: { 'data-testid': 'option-closed' } },
  { value: 'hidden', label: 'Secret', attrs: { 'data-testid': 'option-hidden' } },
]

const at = (wrapper: ReturnType<typeof mount>, testId: string) =>
  wrapper.find(`[data-testid="${testId}"]`)

describe('osToggleGroup', () => {
  let wrapper: ReturnType<typeof mount> | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  describe('rendering', () => {
    it('is a radio group with an accessible name', () => {
      wrapper = mount(OsToggleGroup, {
        props: { options: OPTIONS, value: 'public', label: 'Template' },
      })

      expect(wrapper.attributes('role')).toBe('radiogroup')
      expect(wrapper.attributes('aria-label')).toBe('Template')
    })

    it('checks the current option and fills it, the rest outlined', () => {
      wrapper = mount(OsToggleGroup, { props: { options: OPTIONS, value: 'closed' } })

      expect(at(wrapper, 'option-closed').attributes('aria-checked')).toBe('true')
      expect(at(wrapper, 'option-closed').attributes('data-appearance')).toBe('filled')
      expect(at(wrapper, 'option-closed').attributes('data-variant')).toBe('primary')
      expect(at(wrapper, 'option-public').attributes('aria-checked')).toBe('false')
      expect(at(wrapper, 'option-public').attributes('data-appearance')).toBe('outline')
    })

    it('renders every option as a button with its label', () => {
      wrapper = mount(OsToggleGroup, { props: { options: OPTIONS, value: null } })

      const radios = wrapper.findAll('[role="radio"]')

      expect(radios.map((radio) => radio.text())).toStrictEqual(['Public', 'Closed', 'Secret'])

      radios.forEach((radio) => {
        expect(radio.element.tagName).toBe('BUTTON')
      })
    })

    it('marks a highlighted option', () => {
      wrapper = mount(OsToggleGroup, {
        props: {
          options: [OPTIONS[0], { ...OPTIONS[1], highlighted: true }],
          value: 'public',
        },
      })

      expect(at(wrapper, 'option-closed').classes()).toContain(
        'os-toggle-group__option--highlighted',
      )
      expect(at(wrapper, 'option-public').classes()).not.toContain(
        'os-toggle-group__option--highlighted',
      )
    })

    it('disables an option and puts its reason where the cursor still reaches', () => {
      // A disabled button takes no pointer events, so a title on it would never show.
      wrapper = mount(OsToggleGroup, {
        props: {
          options: [OPTIONS[0], { ...OPTIONS[1], disabled: true, title: 'Not yours' }],
          value: 'public',
        },
      })

      const closed = at(wrapper, 'option-closed')

      expect(closed.attributes('disabled')).toBeDefined()
      expect(closed.element.parentElement?.getAttribute('title')).toBe('Not yours')
    })

    it('adds what the option slot renders after the label', () => {
      wrapper = mount(OsToggleGroup, {
        props: { options: OPTIONS, value: 'public' },
        slots: {
          option: ({ option, selected }: { option: ToggleGroupOption; selected: boolean }) =>
            h('em', { class: 'extra' }, `${option.value}:${String(selected)}`),
        },
      })

      expect(wrapper.findAll('.extra').map((extra) => extra.text())).toStrictEqual([
        'public:true',
        'closed:false',
        'hidden:false',
      ])
    })

    it('passes a class through to the group', () => {
      wrapper = mount(OsToggleGroup, {
        props: { options: OPTIONS, value: null },
        attrs: { class: 'my-row' },
      })

      expect(wrapper.classes()).toStrictEqual(expect.arrayContaining(['os-toggle-group', 'my-row']))
    })
  })

  describe('events', () => {
    it('reports a pick', async () => {
      wrapper = mount(OsToggleGroup, { props: { options: OPTIONS, value: 'public' } })

      await at(wrapper, 'option-hidden').trigger('click')

      expect(wrapper.emitted('select')).toStrictEqual([['hidden']])
    })

    it('reports the option under the cursor, and null when it leaves', async () => {
      wrapper = mount(OsToggleGroup, { props: { options: OPTIONS, value: 'public' } })

      await at(wrapper, 'option-closed').trigger('mouseenter')
      await at(wrapper, 'option-closed').trigger('mouseleave')

      expect(wrapper.emitted('hover')).toStrictEqual([['closed'], [null]])
    })
  })

  describe('keyboard accessibility', () => {
    const mountAttached = (props: Record<string, unknown>) =>
      mount(OsToggleGroup, {
        props: { options: OPTIONS, value: 'public', ...props },
        attachTo: document.body,
      })

    it('is one tab stop: the current option', () => {
      wrapper = mountAttached({ value: 'closed' })

      expect(at(wrapper, 'option-closed').attributes('tabindex')).toBe('0')
      expect(at(wrapper, 'option-public').attributes('tabindex')).toBe('-1')
      expect(at(wrapper, 'option-hidden').attributes('tabindex')).toBe('-1')
    })

    it('makes the first enabled option the tab stop when none is current', () => {
      wrapper = mountAttached({
        value: null,
        options: [{ ...OPTIONS[0], disabled: true }, OPTIONS[1], OPTIONS[2]],
      })

      expect(at(wrapper, 'option-closed').attributes('tabindex')).toBe('0')
    })

    it('moves and picks with the arrow keys, wrapping around', async () => {
      wrapper = mountAttached({ value: 'public' })

      await at(wrapper, 'option-public').trigger('keydown', { key: 'ArrowRight' })

      expect(document.activeElement).toBe(at(wrapper, 'option-closed').element)

      await at(wrapper, 'option-public').trigger('keydown', { key: 'ArrowLeft' })

      expect(document.activeElement).toBe(at(wrapper, 'option-hidden').element)

      await at(wrapper, 'option-hidden').trigger('keydown', { key: 'ArrowDown' })
      await at(wrapper, 'option-public').trigger('keydown', { key: 'ArrowUp' })

      expect(wrapper.emitted('select')).toStrictEqual([
        ['closed'],
        ['hidden'],
        ['public'],
        ['hidden'],
      ])
    })

    it('jumps to the first and last option with Home and End', async () => {
      wrapper = mountAttached({ value: 'closed' })

      await at(wrapper, 'option-closed').trigger('keydown', { key: 'End' })

      expect(document.activeElement).toBe(at(wrapper, 'option-hidden').element)

      await at(wrapper, 'option-hidden').trigger('keydown', { key: 'Home' })

      expect(document.activeElement).toBe(at(wrapper, 'option-public').element)
    })

    it('skips disabled options', async () => {
      wrapper = mountAttached({
        options: [OPTIONS[0], { ...OPTIONS[1], disabled: true }, OPTIONS[2]],
      })

      await at(wrapper, 'option-public').trigger('keydown', { key: 'ArrowRight' })

      expect(wrapper.emitted('select')).toStrictEqual([['hidden']])
    })

    it('only moves focus with manual activation — Enter or Space pick', async () => {
      // For a pick with a consequence of its own (a confirmation dialog), moving through the
      // options must not set that off on every key press.
      wrapper = mountAttached({ activation: 'manual' })

      await at(wrapper, 'option-public').trigger('keydown', { key: 'ArrowRight' })

      expect(document.activeElement).toBe(at(wrapper, 'option-closed').element)
      expect(wrapper.emitted('select')).toBeUndefined()
    })

    it('ignores keys that are not navigation', async () => {
      wrapper = mountAttached({})

      await at(wrapper, 'option-public').trigger('keydown', { key: 'a' })

      expect(wrapper.emitted('select')).toBeUndefined()
    })

    it('does not pick a disabled option on click', async () => {
      wrapper = mountAttached({
        options: [OPTIONS[0], { ...OPTIONS[1], disabled: true }],
      })

      // A disabled native button takes no click — that, not a check of its own, is the guard.
      await at(wrapper, 'option-closed').trigger('click')

      expect(wrapper.emitted('select')).toBeUndefined()
    })
  })
})
