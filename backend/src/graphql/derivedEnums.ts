// GraphQL enums the schema DERIVES from their single sources instead of hand-writing them in
// SDL: PolicyKey from policy.schema.json, EnvCategory from config/categories. Built here ONCE so
// the two schema consumers stay in lockstep:
//   • the runtime schema (src/graphql/types/index.ts) merges these into typeDefs, and
//   • graphql-eslint's static schema (eslint.config.ts) needs them too, else a .gql file using
//     `PolicyKey!` / `EnvCategory!` fails to load ("Unknown type").
// A new derived enum is added in exactly this one place and both pick it up automatically.
//
// This module is imported by eslint.config.ts, whose loader (jiti) resolves NEITHER the `@src`
// path alias (verified: "Cannot find module '@src/config/categories'") NOR heavy runtime modules
// (ajv). So it must reach its sources via plain RELATIVE imports and depend only on the raw leaf
// sources (the JSON + the category array) — never `policy/schema.ts`. That means `../` parent
// imports, which the repo's import-x/no-relative-parent-imports rule forbids for src/ files;
// the rule is disabled below for exactly this cross-tooling constraint. (The app-side consumers
// still use the alias: index.ts imports this via `@src/graphql/derivedEnums`.)
/* eslint-disable import-x/no-relative-parent-imports */
import { ENV_CATEGORIES } from '../config/categories'
import policySchema from '../policy/policy.schema.json'
/* eslint-enable import-x/no-relative-parent-imports */

// A GraphQL enum value must be a valid GraphQL name. A policy key or category with e.g. a dot
// or a leading digit would otherwise only surface as a cryptic schema-PARSE error, far from its
// source — so assert it here at SDL-build time, with a message that names the offender.
const GRAPHQL_NAME = /^[_a-zA-Z][_a-zA-Z0-9]*$/

export function enumSDL(name: string, values: readonly string[]): string {
  for (const value of values) {
    if (!GRAPHQL_NAME.test(value)) {
      throw new Error(
        `derivedEnums: "${value}" is not a valid GraphQL enum value for ${name} (must match ${GRAPHQL_NAME.source}).`,
      )
    }
  }
  return `enum ${name} { ${values.join(' ')} }`
}

// PolicyKey — every key in the policy schema. Object.keys(properties) is exactly what
// policy/schema.ts's allKeys() returns, in the same (declaration) order.
export const policyKeyEnumSDL = enumSDL('PolicyKey', Object.keys(policySchema.properties))

// EnvCategory — the shared category vocabulary, in its global display order.
export const envCategoryEnumSDL = enumSDL('EnvCategory', ENV_CATEGORIES)

// Every derived enum, for spreading into a schema source list.
export const derivedEnumSDLs = [policyKeyEnumSDL, envCategoryEnumSDL]
