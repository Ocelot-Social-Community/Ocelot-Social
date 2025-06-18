/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { sign } from 'jsonwebtoken'

import type CONFIG from '@src/config'

const jwt = { sign }
// Generate an Access Token for the given User ID
export const encode =
  (context: {
    config: Pick<typeof CONFIG, 'JWT_SECRET' | 'JWT_EXPIRES' | 'GRAPHQL_URI' | 'CLIENT_URI'>
  }) =>
  (user) => {
    const { id, name, slug } = user
    const token: string = jwt.sign({ id, name, slug }, context.config.JWT_SECRET, {
      expiresIn: context.config.JWT_EXPIRES,
      issuer: context.config.GRAPHQL_URI,
      audience: context.config.CLIENT_URI,
      subject: user.id.toString(),
    })
    return token
  }
