import defaults from "./metadataDefaults";

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

export default {
  ...defaults,
  ...(Object.values(overlay)[0] ?? {}),
};
