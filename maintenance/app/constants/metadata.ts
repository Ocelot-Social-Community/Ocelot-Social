// Vanilla identity. A brand does NOT replace this file — build-maintenance-branding.ts writes
// `metadata.brand.json` next to it and the overlay below wins per key, so `git status` stays clean
// after branding and undoing it is a delete. No overlay → vanilla ocelot.social.
//
// import.meta.glob rather than a plain import: the overlay is git-ignored and usually absent, and a
// static import of a missing file fails the build. `eager` keeps it a compile-time inline, not a
// runtime fetch — this page has to render with no network at all.
const overlay = import.meta.glob<Record<string, string>>(
  "./metadata.brand.json",
  {
    eager: true,
    import: "default",
  },
);

const defaults = {
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
  // serves from /img/brand/ — the filename varies (.svg / .png), so it travels as a key, not a
  // hard-coded path in app.vue.
  LOGO: "/img/custom/logo-squared.svg",
};

export default {
  ...defaults,
  ...(Object.values(overlay)[0] ?? {}),
};
