// The support address is DEPLOYMENT configuration, not branding: the backend and webapp read
// $SUPPORT_EMAIL at runtime and every network sets it in its helmfile, which is why no brand.config
// carries an e-mail and the brand archives contain none.
//
// This page is static — nginx serves it precisely when everything else is down, so there is no server
// to ask. The address therefore arrives one of two ways, in this order:
//
//   1. $SUPPORT_EMAIL at BUILD time  → baked into the payload (nuxt.config.ts runtimeConfig)
//   2. $SUPPORT_EMAIL at START time  → nginx/40-support-email.sh replaces PLACEHOLDER in the built
//                                      HTML (see maintenance/Dockerfile). This is the path used in
//                                      production: the value lives in the helm chart, so no brand
//                                      repo has to thread a build arg through its CI.
//
// Neither → the vanilla address below, which is the SAME software default the backend falls back to
// (backend/src/config/softwareDefaults.ts SUPPORT_EMAIL) and the webapp ships in its .env.template.
// An unconfigured deployment must not show a different address here than everywhere else.
export const SUPPORT_EMAIL_PLACEHOLDER = "__OCELOT_SUPPORT_EMAIL__";

/**
 * Is `value` something the page can put in front of a visitor as an address?
 *
 * Shape-based ON PURPOSE, rather than `value === SUPPORT_EMAIL_PLACEHOLDER`. That comparison was the
 * bug: the token is a string in the CLIENT BUNDLE too (the sentinel this function replaces), the
 * entrypoint rewrote every occurrence it found, and so the sentinel became the configured address
 * alongside the runtime config. `configured === PLACEHOLDER` was then true exactly when the
 * substitution had SUCCEEDED — every correctly configured deployment rendered the vanilla address,
 * and only an unconfigured one looked right. Nothing here may depend on the token surviving anywhere.
 *
 * Not RFC 5322 — it does not need to be. The only inputs to separate are a real address on one side
 * and an unsubstituted token or an empty runtime config on the other; a shape this coarse does that
 * while accepting the `&`, `|`, `\` and `/` a local part may legally carry (see the entrypoint's
 * escaping, and the cases in emails.spec.ts).
 */
export function isSupportAddress(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default {
  SUPPORT_EMAIL: "hello@ocelot.social",
};
