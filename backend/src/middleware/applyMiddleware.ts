import { createRequire } from 'node:module'

import type { applyMiddleware as ApplyMiddleware } from 'graphql-middleware'

// graphql-middleware, deliberately loaded as CommonJS — and given its own module so the reason
// lives in ONE place (and so tests have something project-local to stub, which they cannot do
// for a `createRequire` call buried in index.ts).
//
// Why: permissionsMiddleware has to require graphql-shield, whose ESM build is broken
// (`import { isUndefined } from 'util'`, which Node's util namespace does not export). shield()
// returns an IMiddlewareGenerator, and applyMiddleware recognises one by CLASS IDENTITY. That
// identity only holds while both packages resolve to the same module instance: importing
// graphql-middleware as ESM here yields a second copy, the check silently fails, and the
// generator is treated as a plain middleware — surfacing as the misleading "Type generator
// exists in middleware but is missing in Schema" at schema construction.
//
// Both lines disappear together once graphql-shield ships a working ESM build.
export const { applyMiddleware } = createRequire(import.meta.url)('graphql-middleware') as {
  applyMiddleware: typeof ApplyMiddleware
}
