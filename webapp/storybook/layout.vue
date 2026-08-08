<template>
  <div class="container">
    <slot />
  </div>
</template>

<style>
/*  The same globals nuxt.config.js lists under `css:`, so a story is styled like the app. */
/*  There is no global SCSS prelude any more — design tokens are CSS custom properties and */
/*  have to be loaded as a real stylesheet, once, exactly like in the app. */
@import '~/assets/css/root-tokens.css';
@import '~/assets/css/main.css';
/*  Holds the base colours (--color-primary and friends) and the packages/ui bridge. Without it */
/*  every var(--color-primary) in a story resolves to nothing — the app gets it via nuxt.config css:. */
@import '~/assets/css/ocelot-ui-variables.css';
@import '~/assets/css/ds-compat.css';
/*  @ocelot-social/ui component styles (Tailwind utilities + OsMenu/ActionButton/LabeledButton CSS).
    Without these every OsButton/OsCard/OsSpinner/... in a story renders completely unstyled — nuxt.config.js
    loads them the same way via its `css:` array, storybook needs the same two files explicitly. */
@import '~/../packages/ui/dist/style.css';
@import '~/../packages/ui/dist/ui.css';

.container {
  padding: 5rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
