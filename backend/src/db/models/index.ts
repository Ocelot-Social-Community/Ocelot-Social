/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable n/global-require */
// NOTE: We cannot use `fs` here to clean up the code. Cypress breaks on any npm
// module that is not browser-compatible. Node's `fs` module is server-side only

import type Neode from 'neode'

type SchemaObject = Neode.SchemaObject

/**
 * Loads a model's default export.
 *
 * All model files use `export default { ... }` which TypeScript compiles to
 * CommonJS with `__esModule: true` marker. Both Node.js and Webpack handle
 * this consistently, so we can safely access `.default` directly.
 */
/* eslint-disable import/no-dynamic-require, security/detect-non-literal-require,
   @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
const loadModel = (modulePath: string): SchemaObject => require(modulePath).default
/* eslint-enable import/no-dynamic-require, security/detect-non-literal-require,
   @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

export default {
  File: loadModel('./File'),
  Image: loadModel('./Image'),
  Badge: loadModel('./Badge'),
  User: loadModel('./User'),
  Group: loadModel('./Group'),
  EmailAddress: loadModel('./EmailAddress'),
  UnverifiedEmailAddress: loadModel('./UnverifiedEmailAddress'),
  SocialMedia: loadModel('./SocialMedia'),
  Post: loadModel('./Post'),
  Comment: loadModel('./Comment'),
  Category: loadModel('./Category'),
  Tag: loadModel('./Tag'),
  Location: loadModel('./Location'),
  Donations: loadModel('./Donations'),
  Report: loadModel('./Report'),
  Migration: loadModel('./Migration'),
  InviteCode: loadModel('./InviteCode'),
}
