<script lang="ts">
  import {
    defineComponent,
    getCurrentInstance,
    onBeforeUnmount,
    onMounted,
    onUpdated,
    watch,
  } from 'vue-demi'

  import { createTooltip } from './tooltip'

  import type { Tooltip } from './tooltip'
  import type { TooltipOptions, TooltipPlacement } from './types'
  import type { PropType } from 'vue-demi'

  /** The bit of a component instance read here, the same in Vue 2 and Vue 3. */
  interface ComponentProxy {
    /** The rendered root: here, the slot's element. */
    $el?: unknown
  }

  /**
   * A tooltip on the one element in its slot, which it renders as is: no wrapper, so the
   * layout stays the same. For library components that show a tooltip on their own parts;
   * on a plain element, `v-os-tooltip` does the same.
   *
   * @slot default - Exactly one element, the one the tooltip describes
   */
  export default defineComponent({
    name: 'OsTooltip',
    props: {
      /** The text. Empty: no tooltip. */
      content: {
        type: String,
        default: '',
      },
      /** Where the tooltip sits; it flips and shifts at the screen's edges. */
      placement: {
        type: String as PropType<TooltipPlacement>,
        default: 'top',
      },
      /** Read `content` as HTML. Never with text from outside: it would be injected as markup. */
      html: {
        type: Boolean,
        default: false,
      },
      /** Keep the line breaks in `content`, left-aligned. */
      multiline: {
        type: Boolean,
        default: false,
      },
      /** Hold the tooltip to a narrow width, so a sentence wraps into a short block. */
      narrow: {
        type: Boolean,
        default: false,
      },
      /** Milliseconds before showing and hiding; one number for both. Default 750 / 50. */
      delay: {
        type: [Number, Object] as PropType<TooltipOptions['delay']>,
        default: undefined,
      },
      /**
       * Shows (`true`) or hides (`false`) the tooltip, instead of hover and focus.
       * Left out, hover and focus decide.
       */
      show: {
        type: Boolean,
        default: undefined,
      },
    },
    setup(props, { slots }) {
      const instance = getCurrentInstance()
      let tooltip: Tooltip | null = null
      let reference: HTMLElement | null = null

      const options = (): TooltipOptions => ({
        content: props.content,
        placement: props.placement,
        html: props.html,
        multiline: props.multiline,
        narrow: props.narrow,
        delay: props.delay,
        trigger: props.show === undefined ? 'hover focus' : 'manual',
        show: props.show,
      })

      // The slot's element, which a re-render may replace (e.g. a `v-if` in the slot).
      function sync() {
        const el = (instance?.proxy as ComponentProxy | undefined)?.$el
        const next = el instanceof HTMLElement ? el : null
        if (next === reference) {
          return
        }
        tooltip?.destroy()
        reference = next
        tooltip = reference ? createTooltip(reference, options()) : null
      }

      onMounted(sync)
      onUpdated(sync)
      watch(options, (value) => tooltip?.update(value))
      onBeforeUnmount(() => {
        tooltip?.destroy()
        tooltip = null
      })

      return () => slots.default?.()[0]
    },
  })
</script>
