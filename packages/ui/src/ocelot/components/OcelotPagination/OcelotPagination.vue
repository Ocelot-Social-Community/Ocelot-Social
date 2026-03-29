<script lang="ts">
  import { computed, defineComponent, h, isVue2 } from 'vue-demi'

  import OsButton from '#src/components/OsButton/OsButton.vue'
  import OsIcon from '#src/components/OsIcon/OsIcon.vue'

  import type { Component, PropType } from 'vue-demi'

  /**
   * Previous/Next pagination with optional page counter.
   *
   * @emits back - Previous button clicked
   * @emits next - Next button clicked
   */
  export default defineComponent({
    name: 'OcelotPagination',
    props: {
      /** Icon for the "previous" button */
      iconPrevious: { type: [Object, Function] as PropType<Component>, required: true },
      /** Icon for the "next" button */
      iconNext: { type: [Object, Function] as PropType<Component>, required: true },
      /** Accessible label for the previous button */
      labelPrevious: { type: String, default: 'Previous' },
      /** Accessible label for the next button */
      labelNext: { type: String, default: 'Next' },
      /** Whether there is a previous page */
      hasPrevious: { type: Boolean, default: false },
      /** Whether there is a next page */
      hasNext: { type: Boolean, default: false },
      /** Current page index (0-based) */
      activePage: { type: Number, default: 0 },
      /** Number of items per page (for calculating total pages) */
      pageSize: { type: Number, default: 24 },
      /** Total number of items in the active resource */
      activeResourceCount: { type: Number, default: 0 },
      /** Whether to show the page counter between buttons */
      showPageCounter: { type: Boolean, default: false },
      /** Label for the page counter (e.g. "Page") */
      pageLabel: { type: String, default: '' },
    },
    setup(props, { emit }) {
      const totalPages = computed(() =>
        props.activeResourceCount > 0
          ? Math.floor((props.activeResourceCount - 1) / props.pageSize) + 1
          : 1,
      )

      return () => {
        const prevIcon = [h(OsIcon, isVue2
          ? { props: { icon: props.iconPrevious } }
          : { icon: props.iconPrevious },
        )]

        const nextIcon = [h(OsIcon, isVue2
          ? { props: { icon: props.iconNext } }
          : { icon: props.iconNext },
        )]

        const prevButton = h(
          OsButton,
          isVue2
            ? {
                props: {
                  disabled: !props.hasPrevious,
                  appearance: 'outline',
                  variant: 'primary',
                  circle: true,
                },
                attrs: {
                  'aria-label': props.labelPrevious,
                  'data-test': 'previous-button',
                },
                on: { click: () => emit('back') },
              }
            : {
                disabled: !props.hasPrevious,
                appearance: 'outline',
                variant: 'primary',
                circle: true,
                'aria-label': props.labelPrevious,
                'data-test': 'previous-button',
                onClick: () => emit('back'),
              },
          isVue2 ? prevIcon : { icon: () => prevIcon },
        )

        const nextButton = h(
          OsButton,
          isVue2
            ? {
                props: {
                  disabled: !props.hasNext,
                  appearance: 'outline',
                  variant: 'primary',
                  circle: true,
                },
                attrs: {
                  'aria-label': props.labelNext,
                  'data-test': 'next-button',
                },
                on: { click: () => emit('next') },
              }
            : {
                disabled: !props.hasNext,
                appearance: 'outline',
                variant: 'primary',
                circle: true,
                'aria-label': props.labelNext,
                'data-test': 'next-button',
                onClick: () => emit('next'),
              },
          isVue2 ? nextIcon : { icon: () => nextIcon },
        )

        const children: ReturnType<typeof h>[] = [prevButton]

        if (props.showPageCounter) {
          const prefix = props.pageLabel ? `${props.pageLabel} ` : ''
          const counterText = `${prefix}${props.activePage + 1} / ${totalPages.value}`
          children.push(
            h(
              'span',
              {
                class: 'ocelot-pagination__counter',
                ...(isVue2 ? { attrs: { 'data-test': 'pagination-pageCount' } } : { 'data-test': 'pagination-pageCount' }),
              },
              isVue2 ? [counterText] : counterText,
            ),
          )
        }

        children.push(nextButton)

        return h('div', { class: 'ocelot-pagination' }, children)
      }
    },
  })
</script>

<style>
  .ocelot-pagination {
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 200px;
    margin: 8px auto;
  }

  .ocelot-pagination__counter {
    margin: 8px auto;
  }
</style>
