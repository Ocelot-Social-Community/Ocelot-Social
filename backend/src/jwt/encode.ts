/* eslint-disable import-x/no-named-as-default-member -- jsonwebtoken is CommonJS: the named
   exports its types advertise do not exist for Node's ESM loader (it derives them by static
   analysis and misses these), so `import { verify }` type-checks and then throws at load.
   Reaching through the default import is the only form that works at runtime. */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// Default import, not named: the package is CommonJS and Node derives named exports
// from it by static analysis, which misses these. `import { … }` type-checks and then
// throws at load. The default import is the whole module.exports.
import jwt from 'jsonwebtoken'

import type CONFIG from '@src/config'

// Generate an Access Token for the given User ID
export const encode =
  (context: {
    config: Pick<typeof CONFIG, 'JWT_SECRET' | 'JWT_EXPIRES' | 'GRAPHQL_URI' | 'CLIENT_URI'>
  }) =>
  (user) => {
    const { id, name, slug } = user
    const token: string = jwt.sign({ id, name, slug }, context.config.JWT_SECRET, {
      // Stated rather than left to the library default, so the algorithm this deployment signs
      // with is pinned in one place together with the `algorithms` allow-list decode.ts verifies
      // against — the pair is what closes the algorithm-confusion door.
      algorithm: 'HS256',
      // Already validated as a parseable lifetime by config/jwtExpires.ts.
      expiresIn: context.config.JWT_EXPIRES,
      issuer: context.config.GRAPHQL_URI,
      audience: context.config.CLIENT_URI,
      subject: user.id.toString(),
    })
    return token
  }
