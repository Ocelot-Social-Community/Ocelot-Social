// The framework tokens that were taken away on purpose, and what a brand should set instead.
//
// A token the framework declares (webapp/assets/css/root-tokens.css, ocelot-ui-variables.css) is
// something a brand may set, and it is listed in the admin as such. Taking one away turns every
// brand's value for it into a silent no-op: no error in the build, none at runtime. So taking one away
// is a decision with an entry here, never a side effect of a refactor:
//
//   • Renaming → keep the old name in the stylesheet as an alias of the new one (`--old: var(--new)`)
//     until the brands have moved over, then remove it and list it here.
//   • Removing → list it here with the reason and the token to use instead.
//
// scripts/public-tokens.spec.ts fails on a token that is gone from the stylesheets and not listed
// here; the brand build warns about a brand that still sets one that is (scripts/lib/build-brandings.ts).
//
// name (without the leading `--`) → what to do instead.
export const REMOVED_TOKENS: Readonly<Record<string, string>> = {}
