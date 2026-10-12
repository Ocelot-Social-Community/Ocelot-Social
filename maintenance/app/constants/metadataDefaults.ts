// The vanilla values behind app/constants/metadata.ts, in a module of their own: nuxt.config.ts needs
// them too, to put the Open Graph tags into the prerendered markup, and it cannot import metadata.ts
// (import.meta.glob exists only inside vite). One list, two readers.
export default {
  APPLICATION_NAME: "ocelot.social",
  APPLICATION_SHORT_NAME: "ocelot.social",
  APPLICATION_DESCRIPTION: "ocelot.social Community Network",
  ORGANIZATION_NAME: "ocelot.social Community",
  ORGANIZATION_JURISDICTION: "City of Angels",
  THEME_COLOR: "rgb(23, 181, 63)",
  OG_IMAGE: "/img/custom/logo-squared.png",
  OG_IMAGE_ALT: "ocelot.social Logo",
  OG_IMAGE_WIDTH: "1200",
  OG_IMAGE_HEIGHT: "1140",
  OG_IMAGE_TYPE: "image/png",
  // The squared logo on the page. A brand points this at the copy of its own logo that the generator
  // serves from /brand/ — the filename varies (.svg / .png), so it travels as a key, not a
  // hard-coded path in app.vue.
  LOGO: "/img/custom/logo-squared.svg",
  // The browser-tab icon. Vanilla is the committed public/favicon.ico; a brand points this at the copy
  // the generator serves from /brand/. nuxt.config.ts reads the same overlay to emit the <link> at
  // BUILD time — with `ssr: false` nothing from useHead reaches the prerendered index.html, so a
  // runtime-only link would leave the browser to its implicit /favicon.ico request in the meantime.
  FAVICON: "/favicon.ico",
};
