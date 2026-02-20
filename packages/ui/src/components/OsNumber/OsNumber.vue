<script lang="ts">
  import {
    defineComponent,
    getCurrentInstance,
    h,
    isVue2,
    onMounted,
    onUnmounted,
    ref,
    watch,
  } from 'vue-demi'

  import { cn } from '#src/utils'

  import { numberVariants } from './number.variants'

  import type { ClassValue } from 'clsx'

  const ANIMATION_DURATION = 1500

  function easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t)
  }

  /**
   * Non-interactive numeric display with optional label and count-up animation.
   *
   * @slot default - Not used. Content is derived from the `count` prop.
   */
  export default defineComponent({
    name: 'OsNumber',
    inheritAttrs: false,
    props: {
      /**
       * The number to display.
       */
      count: {
        type: Number,
        required: true,
      },
      /**
       * Optional label displayed below the count.
       */
      label: {
        type: String,
        default: undefined,
      },
      /**
       * Whether to animate from 0 to the count value on mount.
       * Re-animates when count changes.
       */
      animated: {
        type: Boolean,
        default: false,
      },
    },
    setup(props, { attrs }) {
      /* v8 ignore start -- Vue 2 only */
      const instance = isVue2 ? getCurrentInstance() : null
      /* v8 ignore stop */

      const displayValue = ref(props.animated ? 0 : props.count)
      let animationFrame: number | undefined

      function animateTo(from: number, to: number) {
        if (animationFrame !== undefined) {
          cancelAnimationFrame(animationFrame)
        }

        const startTime = performance.now()

        function step(currentTime: number) {
          const elapsed = currentTime - startTime
          const progress = Math.min(elapsed / ANIMATION_DURATION, 1)
          const easedProgress = easeOut(progress)

          displayValue.value = Math.round(from + (to - from) * easedProgress)

          if (progress < 1) {
            animationFrame = requestAnimationFrame(step)
          }
        }

        animationFrame = requestAnimationFrame(step)
      }

      onMounted(() => {
        if (props.animated) {
          animateTo(0, props.count)
        }
      })

      onUnmounted(() => {
        if (animationFrame !== undefined) {
          cancelAnimationFrame(animationFrame)
        }
      })

      watch(
        () => props.count,
        (newVal, oldVal) => {
          if (props.animated) {
            /* v8 ignore start -- oldVal is always numeric from Vue's watch */
            animateTo(oldVal ?? 0, newVal)
            /* v8 ignore stop */
          } else {
            displayValue.value = newVal
          }
        },
      )

      return () => {
        const rootClass = cn('os-number', numberVariants())

        const countAttrs: Record<string, unknown> = {
          class: 'os-number-count font-bold text-[1.5rem] tabular-nums text-center inline-block',
          style: { minWidth: `${String(props.count).length}ch` },
        }

        if (props.animated) {
          countAttrs['aria-hidden'] = 'true'
        }

        const countChild = h('span', countAttrs, [String(displayValue.value)])

        const children = [countChild]

        if (props.animated) {
          children.push(
            h(
              'span',
              {
                class: 'sr-only',
                'aria-live': 'polite',
              },
              [String(props.count)],
            ),
          )
        }

        if (props.label) {
          children.push(
            h('span', { class: 'os-number-label text-[12px] text-[var(--color-text-soft)]' }, [
              props.label,
            ]),
          )
        }

        /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
        if (isVue2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proxy = instance?.proxy as any
          const parentClass = proxy?.$vnode?.data?.staticClass || ''
          const parentDynClass = proxy?.$vnode?.data?.class
          const parentAttrs = proxy?.$vnode?.data?.attrs || {}

          return h(
            'div',
            {
              class: cn(rootClass, parentClass, parentDynClass),
              attrs: { ...parentAttrs, ...attrs },
            },
            children,
          )
        }
        /* v8 ignore stop */

        const { class: attrClass, ...restAttrs } = attrs as Record<string, unknown>

        return h(
          'div',
          {
            class: cn(rootClass, attrClass as ClassValue),
            ...restAttrs,
          },
          children,
        )
      }
    },
  })
</script>
