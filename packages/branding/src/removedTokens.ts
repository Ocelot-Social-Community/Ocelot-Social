// The framework tokens that were taken away on purpose, and what a brand should set instead.
//
// A token the framework declares (webapp/assets/css/root-tokens.css, ocelot-ui-variables.css) is
// something a brand may set, and it is listed in the admin as such. Taking one away turns every
// brand's value for it into a silent no-op: no error in the build, none at runtime. So taking one away
// is a decision with an entry here, never a side effect of a refactor:
//
//   • Renaming → the new token falls back to the old one: `--new: var(--old, <the default>)`. Nothing
//     declares `--old` any more, so a brand that still sets it keeps working — its value flows into
//     `--new` — and gets a build warning telling it to set `--new` instead. List `--old` here with
//     `use: 'new'`. Drop the fallback and the entry together once the brands have moved over.
//   • Removing → list it here with a `note` saying why and what to do instead. Its value stops doing
//     anything; the build warns every brand that still sets it.
//
// scripts/public-tokens.spec.ts fails on a token that is gone from the stylesheets and not listed
// here, and on a `use` whose token does not fall back to the old one (a rename without its redirect
// would be a plain removal). The brand build warns about a brand that still sets a listed one
// (scripts/lib/build-brandings.ts).
//
// name (without the leading `--`) → what became of it.
export interface RemovedToken {
  /** The token that replaced it (without `--`), which must fall back to `var(--<this name>, …)`. */
  use?: string
  /** What else a brand should know: why it is going, what to do when nothing replaces it. */
  note?: string
}

export const REMOVED_TOKENS: Readonly<Record<string, RemovedToken>> = {}
