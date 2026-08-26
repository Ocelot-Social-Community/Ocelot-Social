import { Category } from '@db/schema/entities/Category'
import { Comment } from '@db/schema/entities/Comment'
import { Group } from '@db/schema/entities/Group'
import { Location } from '@db/schema/entities/Location'
import { Post } from '@db/schema/entities/Post'
import { Tag } from '@db/schema/entities/Tag'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

// What a user produced and where it sits: posts, comments, categories, tags, groups, places.

export const WROTE = defineRelationship({
  type: 'WROTE',
  from: User,
  // Polymorphic: 158 edges point at posts, 101 at comments in a seeded database.
  to: [Post, Comment],
  cardinality: 'many',
})

export const COMMENTS = defineRelationship({
  type: 'COMMENTS',
  from: Comment,
  to: Post,
  cardinality: 'exactly-one',
})

export const CATEGORIZED = defineRelationship({
  type: 'CATEGORIZED',
  from: [Post, Group],
  to: Category,
  cardinality: 'many',
})

export const TAGGED = defineRelationship({
  type: 'TAGGED',
  from: Post,
  to: Tag,
  cardinality: 'many',
})

export const IN = defineRelationship({
  type: 'IN',
  from: Post,
  to: Group,
  cardinality: 'at-most-one',
})

export const IS_IN = defineRelationship({
  type: 'IS_IN',
  // Location nests inside Location (city -> country); everything else points into that tree.
  from: [User, Group, Post, Location],
  to: Location,
  cardinality: 'at-most-one',
})
