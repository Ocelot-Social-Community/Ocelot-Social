import Vue from 'vue'
import VTooltip from 'v-tooltip'

export const options = {
  // Tooltip content goes in as text. v-tooltip's own default inserts it as HTML, and many
  // tooltips carry names users choose themselves (a user, a group, a call participant), so a
  // name with markup would run in the browser of whoever hovers it. A tooltip that really needs
  // markup can still ask for it with `html: true`.
  defaultHtml: false,
  defaultDelay: {
    show: 750,
    hide: 50,
  },
  defaultOffset: 2,
  defaultPopperOptions: {
    removeOnDestroy: true,
  },
  popover: {
    // defaultArrowClass: 'm-dropdown__arrow'
  },
}

Vue.use(VTooltip, options)
