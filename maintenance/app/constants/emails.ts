// The support address is DEPLOYMENT configuration, not branding: the backend and webapp read
// $SUPPORT_EMAIL at runtime and every network sets it in its helmfile, which is why no brand.config
// carries an e-mail and the brand archives contain none.
//
// This page is static — nginx serves it precisely when everything else is down, so there is no server
// to ask. The address therefore arrives one of two ways, in this order:
//
//   1. $SUPPORT_EMAIL at BUILD time  → baked into the payload (nuxt.config.ts runtimeConfig)
//   2. $SUPPORT_EMAIL at START time  → nginx/40-support-email.sh replaces PLACEHOLDER in the built
//                                      files (see maintenance/Dockerfile). This is the path used in
//                                      production: the value lives in the helm chart, so no brand
//                                      repo has to thread a build arg through its CI.
//
// Neither → the vanilla address below.
export const SUPPORT_EMAIL_PLACEHOLDER = "__OCELOT_SUPPORT_EMAIL__";

export default {
  SUPPORT_EMAIL: "devops@ocelot.social",
};
