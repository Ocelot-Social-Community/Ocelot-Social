// NOTE: We cannot use `fs` here to clean up the code. Cypress breaks on any npm
// module that is not browser-compatible. Node's `fs` module is server-side only
//
// We use static imports instead of dynamic require() to ensure compatibility
// with both Node.js and Webpack (used by Cypress cucumber preprocessor).

import Badge from './Badge'
import Category from './Category'
import Comment from './Comment'
import Donations from './Donations'
import EmailAddress from './EmailAddress'
import File from './File'
import Group from './Group'
import Image from './Image'
import InviteCode from './InviteCode'
import Location from './Location'
import Migration from './Migration'
import Post from './Post'
import Report from './Report'
import SocialMedia from './SocialMedia'
import Tag from './Tag'
import UnverifiedEmailAddress from './UnverifiedEmailAddress'
import User from './User'

import type Neode from 'neode'

// Type assertion needed because TypeScript infers literal types from the model
// objects (e.g., type: 'string' as literal), but Neode expects the broader
// SchemaObject type with PropertyTypes union. The Neode type definitions are
// incomplete/incorrect, so we use double assertion to bypass the check.
export default {
  Badge,
  Category,
  Comment,
  Donations,
  EmailAddress,
  File,
  Group,
  Image,
  InviteCode,
  Location,
  Migration,
  Post,
  Report,
  SocialMedia,
  Tag,
  UnverifiedEmailAddress,
  User,
} as unknown as Record<string, Neode.SchemaObject>
