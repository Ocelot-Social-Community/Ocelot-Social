// The VANILLA fallback only. The support address is deployment configuration, not branding: the
// backend and webapp read $SUPPORT_EMAIL at runtime and every network sets it in its helmfile
// (`SUPPORT_EMAIL: "support@example.org"`), which is why no brand.config carries it.
//
// This page is static, so it has no runtime env to read — $SUPPORT_EMAIL is baked in at BUILD time
// instead (see nuxt.config.ts `runtimeConfig.public.supportEmail`). Unset → the address below.
export default {
  SUPPORT_EMAIL: "devops@ocelot.social",
};
