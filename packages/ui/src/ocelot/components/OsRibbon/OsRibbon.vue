<script lang="ts">
  import { defineComponent, h, isVue2 } from 'vue-demi'

  /**
   * Small corner ribbon indicating a post's type (e.g. "Article", "Event").
   * Pure presentation — background color and the diagonal shadow triangle are
   * driven by the `type`/`pinned` props. Positioning within the host layout
   * (e.g. absolute placement on a card corner) is left to the consumer, via
   * its own class/style on the component root.
   */
  export default defineComponent({
    name: 'OsRibbon',
    props: {
      /** Text displayed inside the ribbon */
      text: { type: String, default: '' },
      /** Post type driving the ribbon's background color (e.g. 'Event') */
      type: { type: String, default: '' },
      /** Pinned/announcement styling — takes precedence over `type` */
      pinned: { type: Boolean, default: false },
    },
    setup(props) {
      return () =>
        h(
          'aside',
          {
            class: [
              'os-ribbon',
              props.type === 'Event' && 'os-ribbon--event',
              props.pinned && 'os-ribbon--pinned',
            ],
          },
          [
            h(
              'p',
              { class: 'os-ribbon__text' },
              /* v8 ignore next -- Vue 2 */ isVue2 ? [props.text] : props.text,
            ),
          ],
        )
    },
  })
</script>

<style>
  .os-ribbon {
    padding: var(--os-ribbon-padding, 6px);
    border-radius: var(--os-ribbon-radius, 2px) 0 0 var(--os-ribbon-radius, 2px);
    color: var(--os-ribbon-color, rgb(255, 255, 255));
    background-color: var(--os-ribbon-bg, var(--color-ribbon-article, rgb(10, 161, 255)));
    font-size: var(--os-ribbon-font-size, 0.7rem);
    font-weight: var(--os-ribbon-font-weight, 600);
  }

  .os-ribbon__text {
    margin: 0;
  }

  .os-ribbon::before {
    content: ' ';
    position: absolute;
    right: 0;
    bottom: calc(-1 * var(--os-ribbon-padding, 6px));
    border-width: var(--os-ribbon-shadow-size, 3px) 4px var(--os-ribbon-shadow-size, 3px)
      var(--os-ribbon-shadow-size, 3px);
    border-style: solid;
    border-color: var(--os-ribbon-bg-shadow, var(--color-ribbon-article-shadow, #0064a3))
      transparent transparent
      var(--os-ribbon-bg-shadow, var(--color-ribbon-article-shadow, #0064a3));
  }

  .os-ribbon--event {
    background-color: var(--os-ribbon-event-bg, var(--color-ribbon-event, rgb(160, 103, 255)));
  }

  .os-ribbon--event::before {
    border-color: var(--os-ribbon-event-bg-shadow, var(--color-ribbon-event-shadow, #6001ff))
      transparent transparent
      var(--os-ribbon-event-bg-shadow, var(--color-ribbon-event-shadow, #6001ff));
  }

  /* Derived from --color-warning (not a fixed literal like article/event above) so a brand
     overriding the shared warning color re-themes the pinned ribbon too, matching the source
     app's --color-ribbon-announcement/-shadow, which were themselves derived from it. */
  .os-ribbon--pinned {
    background-color: var(--os-ribbon-pinned-bg, var(--color-warning, rgb(230, 121, 25)));
  }

  .os-ribbon--pinned::before {
    border-color: var(
        --os-ribbon-pinned-bg-shadow,
        color-mix(in srgb, var(--color-warning, rgb(230, 121, 25)), black 20%)
      )
      transparent transparent
      var(
        --os-ribbon-pinned-bg-shadow,
        color-mix(in srgb, var(--color-warning, rgb(230, 121, 25)), black 20%)
      );
  }
</style>
