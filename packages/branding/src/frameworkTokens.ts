// The framework's own `:root` tokens, as a snapshot that TRAVELS WITH THE PACKAGE.
//
// Read from a committed file rather than from webapp/assets/css, because the two places that need it
// cannot see that directory: a brand packaged in its own repository has no webapp beside it, and
// neither does the Docker stage that builds this package (`COPY packages/branding/. .` and nothing
// else). Both build brand archives, and an archive built without the framework tokens cannot resolve
// a brand's theme — the brand overrides `--color-primary`, while the token an e-mail link actually
// reads (`--text-color-link: var(--color-primary)`) is declared by the FRAMEWORK, not by the brand.
// Missing that base means quietly emitting nothing rather than failing.
//
// It lives in src/ rather than next to the tooling that writes it because the RUNTIME needs it too:
// resolveThemeColor's fallback is `color-primary` out of this map. Only the file is here — the
// generator stays under scripts/, so nothing drags postcss into a server process (see lib/css.ts).
//
// RAW values, deliberately: `var()` references are flattened only after a brand's overrides have been
// merged on top (scripts/lib/emailTheme.ts). A pre-resolved snapshot would freeze the framework's own
// primary colour into every derived token, and no brand could move it.
//
// Regenerate with `npm run tokens:snapshot`; scripts/framework-tokens.spec.ts fails when it drifts
// from the stylesheets, in the checkouts where those can be read. This file is the stable import
// path; frameworkTokens.generated.ts next to it is the machine-written data.
/** Every `:root` custom property the framework declares, keyed without the leading `--`. */
export { FRAMEWORK_TOKENS } from './frameworkTokens.generated.js'
