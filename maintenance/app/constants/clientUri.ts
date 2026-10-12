// The instance's public origin (https://<domain>) — deployment configuration, like $SUPPORT_EMAIL.
// Link previews need og:image as an ABSOLUTE URL and do not resolve a relative one against the page,
// but the page is static and built once per brand, not per deployment. So the build writes this token
// in front of the image path, and nginx/41-client-uri.sh replaces it with $CLIENT_URI when the
// container starts. Unset, it is replaced with nothing and the path stays relative, as before.
export const CLIENT_URI_PLACEHOLDER = "__OCELOT_CLIENT_URI__";
