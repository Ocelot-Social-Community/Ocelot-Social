<template>
  <div class="area-menu">
    <!-- Wide viewport: vertical sidebar list. -->
    <os-menu
      class="area-menu__list"
      :routes="routes"
      :matcher="matcher"
      :is-exact="isExact"
      :link-tag="linkTag"
    />
    <!-- Narrow viewport: native select dropdown (same routes, navigates on change). -->
    <select
      class="area-menu__select"
      :value="currentPath"
      :aria-label="ariaLabel"
      data-test="area-menu-select"
      @change="$router.push($event.target.value)"
    >
      <option v-for="route in routes" :key="route.path" :value="route.path">
        {{ route.name }}
      </option>
    </select>
  </div>
</template>

<script>
import { OsMenu } from '@ocelot-social/ui'

// Responsive navigation for the permission-gated areas (settings, admin, moderation):
// an OsMenu sidebar on wide viewports that collapses into a native <select> below
// 600px, so the menu never eats vertical space on narrow screens.
// `routes` is the already-filtered list ([{ name, path }]); `matcher`/`isExact` are
// passed straight through to OsMenu (left undefined to inherit OsMenu's own defaults).
export default {
  name: 'AreaMenu',
  components: {
    OsMenu,
  },
  props: {
    routes: {
      type: Array,
      required: true,
    },
    ariaLabel: {
      type: String,
      default: '',
    },
    matcher: {
      type: Function,
      default: undefined,
    },
    isExact: {
      type: Function,
      default: undefined,
    },
    linkTag: {
      type: [String, Object, Function],
      default: 'router-link',
    },
  },
  computed: {
    // Guard against a missing $route (e.g. during isolated unit mounts) so the
    // select's :value binding never throws — mirrors the matcher guards in the
    // area pages.
    currentPath() {
      return this.$route?.path
    },
  },
}
</script>

<style>
.area-menu {
  width: 100%;
}

.area-menu__list {
  display: none;
}

.area-menu__select {
  display: block;
  width: 100%;
  margin-bottom: var(--space-small);
  padding: var(--space-x-small) var(--space-large) var(--space-x-small) var(--space-small);
  font-size: var(--font-size-base);
  border: 1px solid var(--border-color-softer);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  color: var(--text-color-base);
  appearance: none;
  /*  A chevron from two gradients, so it takes the text colour in either theme. */
  background-image:
    linear-gradient(45deg, transparent 50%, var(--text-color-base) 50%),
    linear-gradient(135deg, var(--text-color-base) 50%, transparent 50%);
  background-repeat: no-repeat;
  background-size: 6px 6px;
  background-position:
    right calc(var(--space-small) + 6px) center,
    right var(--space-small) center;
  cursor: pointer;

  &:focus {
    outline: 1px dashed var(--color-primary);
    outline-offset: -1px;
  }
}

@media (--vp-small-up) {
  .area-menu {
    flex: 0 0 200px;
    width: 200px;
  }

  .area-menu__list {
    display: block;
  }

  .area-menu__select {
    display: none;
  }
}
</style>
