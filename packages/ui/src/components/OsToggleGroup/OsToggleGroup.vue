<script lang="ts">
  import { defineComponent, getCurrentInstance, h, isVue2, ref } from 'vue-demi'

  import OsButton from '#src/components/OsButton/OsButton.vue'
  import { cn } from '#src/utils'

  import type { ToggleGroupActivation, ToggleGroupOption } from './types'
  import type { Component, PropType } from 'vue-demi'

  /** Attributes OsToggleGroup sets on an option's button itself; `option.attrs` cannot override them. */
  const MANAGED_ATTRS = new Set([
    'role',
    'aria-checked',
    'tabindex',
    'disabled',
    'data-os-toggle-value',
  ])

  /**
   * A row of buttons of which one is the current one — role tabs, a type picker, a three-way
   * switch. Built on OsButton, primary throughout: the current option filled, the rest outlined —
   * the look of a choice row in the consuming app, not of a row of default buttons.
   *
   * Keyboard follows the WAI-ARIA radio group pattern: the group is ONE tab stop (the current
   * option, else the first enabled one); the arrow keys and Home/End move between the enabled
   * options. With `activation="auto"` (default) moving also picks, as radios do; with `"manual"`
   * the arrows only move focus and Enter/Space pick — for a pick that has a consequence of its
   * own, like a confirmation dialog.
   *
   * Each button sits in a wrapper carrying the option's `title`: a disabled OsButton takes no
   * pointer events, which would swallow the very tooltip that says why it is disabled.
   *
   * @slot option - Extra content after an option's label, e.g. an icon. Props: `{ option, selected }`.
   */
  export default defineComponent({
    name: 'OsToggleGroup',
    inheritAttrs: false,
    props: {
      /** The choices, in order. */
      options: {
        type: Array as PropType<ToggleGroupOption[]>,
        required: true,
      },
      /** The `value` of the current option, or null when none is. */
      value: {
        type: String as PropType<string | null>,
        default: null,
      },
      /** What the group as a whole chooses — its accessible name. */
      label: {
        type: String,
        default: undefined,
      },
      /**
       * Whether moving with the arrow keys also picks.
       * - `auto` — moving picks, as radios do (default)
       * - `manual` — moving only focuses; Enter or Space pick
       */
      activation: {
        type: String as PropType<ToggleGroupActivation>,
        default: 'auto',
      },
    },
    emits: ['select', 'hover'],
    setup(props, { slots, attrs, emit }) {
      const root = ref<HTMLElement | null>(null)

      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      /* v8 ignore stop */

      const enabled = () => props.options.filter((option) => !option.disabled)

      /** The one option in the tab order: the current one, else the first that can be picked. */
      function tabStop(): string | undefined {
        const current = props.options.find(
          (option) => option.value === props.value && !option.disabled,
        )
        return (current ?? enabled()[0])?.value
      }

      function focusOption(target: ToggleGroupOption) {
        /* v8 ignore start -- Vue 2 keeps a string ref in $refs, not in the setup ref */
        const element = (root.value ??
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (instance?.proxy as any)?.$refs?.root) as HTMLElement
        /* v8 ignore stop */
        // The radios render in option order, so an option's index is its button's index.
        const buttons = element.querySelectorAll<HTMLElement>('[role="radio"]')
        ;(buttons[props.options.indexOf(target)] as HTMLElement).focus()
      }

      /**
       * The caller's attributes for an option's button, without the ones the group manages: a
       * `role`, `aria-checked` or `tabindex` of the caller's would break the keyboard pattern, and a
       * `disabled` would disagree with `option.disabled`, which the navigation reads.
       */
      function ownAttrs(option: ToggleGroupOption): Record<string, string> {
        return Object.fromEntries(
          Object.entries(option.attrs ?? {}).filter(([name]) => !MANAGED_ATTRS.has(name)),
        )
      }

      // A disabled option never gets here: its button takes no click, and the arrow keys skip it.
      function pick(option: ToggleGroupOption) {
        emit('select', option.value)
      }

      function onKeydown(event: KeyboardEvent, option: ToggleGroupOption) {
        const choices = enabled()
        const index = choices.findIndex((candidate) => candidate.value === option.value)
        let target: ToggleGroupOption | undefined
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            target = choices[(index + 1) % choices.length]
            break
          case 'ArrowLeft':
          case 'ArrowUp':
            target = choices[(index - 1 + choices.length) % choices.length]
            break
          case 'Home':
            target = choices[0]
            break
          case 'End':
            target = choices[choices.length - 1]
            break
          default:
            return
        }
        event.preventDefault()
        // An option that has focus is enabled, so `choices` is never empty and a target exists.
        focusOption(target as ToggleGroupOption)
        if (props.activation === 'auto') {
          pick(target as ToggleGroupOption)
        }
      }

      // Vue 2's h() does NOT convert onClick → on.click.
      function eventProps(
        events: Record<string, (...args: never[]) => void>,
      ): Record<string, unknown> {
        /* v8 ignore start -- Vue 2 branch */
        if (isVue2) {
          return { on: events }
        }
        /* v8 ignore stop */
        const result: Record<string, unknown> = {}
        for (const [name, fn] of Object.entries(events)) {
          result[`on${name.charAt(0).toUpperCase()}${name.slice(1)}`] = fn
        }
        return result
      }

      return () => {
        const stop = tabStop()
        const items = props.options.map((option) => {
          const selected = option.value === props.value
          const buttonClass = cn(
            'os-toggle-group__option',
            selected && 'os-toggle-group__option--selected',
            option.highlighted &&
              'os-toggle-group__option--highlighted outline-2 outline-solid outline-[var(--color-primary)] outline-offset-2',
          )
          const buttonAttrs = {
            ...ownAttrs(option),
            role: 'radio',
            'aria-checked': String(selected),
            tabindex: option.value === stop ? 0 : -1,
            'data-os-toggle-value': option.value,
          }
          const buttonProps = {
            variant: 'primary',
            appearance: selected ? 'filled' : 'outline',
            size: 'sm',
            disabled: !!option.disabled,
          }
          const events = eventProps({
            click: () => pick(option),
            keydown: (event: KeyboardEvent) => onKeydown(event, option),
            mouseenter: () => emit('hover', option.value),
            mouseleave: () => emit('hover', null),
          })
          const extra = slots.option?.({ option, selected })
          const content = extra ? [option.label, ...extra] : [option.label]

          /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
          if (isVue2) {
            const button = h(
              OsButton,
              { class: buttonClass, props: buttonProps, attrs: buttonAttrs, ...events },
              content,
            )
            return h(
              'span',
              {
                key: option.value,
                class: 'os-toggle-group__slot inline-flex',
                attrs: { title: option.title },
              },
              [button],
            )
          }
          /* v8 ignore stop */

          const button = h(
            OsButton as Component,
            { class: buttonClass, ...buttonProps, ...buttonAttrs, ...events },
            { default: () => content },
          )
          return h(
            'span',
            { key: option.value, class: 'os-toggle-group__slot inline-flex', title: option.title },
            [button],
          )
        })

        const groupClass = 'os-toggle-group flex flex-wrap items-center gap-[4px]'

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class
          return h(
            'div',
            {
              ref: 'root',
              class: cn(groupClass, parentClass, parentDynClass),
              attrs: { role: 'radiogroup', 'aria-label': props.label, ...attrs },
            },
            items,
          )
        }
        /* v8 ignore stop */

        return h(
          'div',
          {
            ...attrs,
            ref: root,
            class: cn(groupClass, attrs.class as string),
            role: 'radiogroup',
            'aria-label': props.label,
          },
          items,
        )
      }
    },
  })
</script>
