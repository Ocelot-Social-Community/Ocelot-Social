// NOTE: We cannot use `fs` here to clean up the code. Cypress breaks on any npm
// module that is not browser-compatible. Node's `fs` module is server-side only
//
// We use static imports instead of dynamic require() to ensure compatibility
// with both Node.js and Webpack (used by Cypress cucumber preprocessor).

import type Neode from 'neode'

import File from './File'
import Image from './Image'
import Badge from './Badge'
import User from './User'
import Group from './Group'
import EmailAddress from './EmailAddress'
import UnverifiedEmailAddress from './UnverifiedEmailAddress'
import SocialMedia from './SocialMedia'
import Post from './Post'
import Comment from './Comment'
import Category from './Category'
import Tag from './Tag'
import Location from './Location'
import Donations from './Donations'
import Report from './Report'
import Migration from './Migration'
import InviteCode from './InviteCode'

// Type assertion needed because TypeScript infers literal types from the model
// objects (e.g., type: 'string' as literal), but Neode expects the broader
// SchemaObject type with PropertyTypes union. The Neode type definitions are
// incomplete/incorrect, so we use double assertion to bypass the check.
export default {
  File,
  Image,
  Badge,
  User,
  Group,
  EmailAddress,
  UnverifiedEmailAddress,
  SocialMedia,
  Post,
  Comment,
  Category,
  Tag,
  Location,
  Donations,
  Report,
  Migration,
  InviteCode,
} as unknown as { [index: string]: Neode.SchemaObject }
