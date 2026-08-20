/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable n/no-unpublished-import */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { faker } from '@faker-js/faker'
import { hashSync } from 'bcryptjs'
import { Factory } from 'rosie'
import { v4 as uuid } from 'uuid'

import { Badge } from '@db/schema/entities/Badge'
import { Category } from '@db/schema/entities/Category'
import { Comment } from '@db/schema/entities/Comment'
import { Donations } from '@db/schema/entities/Donations'
import { EmailAddress } from '@db/schema/entities/EmailAddress'
import { File } from '@db/schema/entities/File'
import { Group } from '@db/schema/entities/Group'
import { Image } from '@db/schema/entities/Image'
import { InviteCode } from '@db/schema/entities/InviteCode'
import { Location } from '@db/schema/entities/Location'
import { Post } from '@db/schema/entities/Post'
import { Report } from '@db/schema/entities/Report'
import { Role } from '@db/schema/entities/Role'
import { SocialMedia } from '@db/schema/entities/SocialMedia'
import { Tag } from '@db/schema/entities/Tag'
import { UnverifiedEmailAddress } from '@db/schema/entities/UnverifiedEmailAddress'
import { User } from '@db/schema/entities/User'
import { createNode, findNode } from '@db/testing/create'
import { generateInviteCode } from '@graphql/resolvers/inviteCodes'
import { isUniqueFor } from '@middleware/sluggifyMiddleware'
import uniqueSlug, { toSlug } from '@middleware/slugify/uniqueSlug'
import { seedDefaultRoleNodes } from '@src/role'

import { getDriver } from './neo4j'

import type { Context } from '@src/context'

// The two entities whose factories carry BUILD inputs next to node properties. neode used to
// drop whatever its model did not declare; nothing does that any more, so the split is made
// here — visibly, which is the point.

/**
 * A fixture user.
 *
 * The defaults below came from `default:` entries in db/models/User.ts. They are written out
 * because that model is going away, and because writerParity.spec.ts pins what a factory user
 * has that a registered one does not — the nine `emailNotifications*` among them. That
 * divergence is accepted (a migration materialised those properties on every pre-existing
 * account), so the factory keeps producing it rather than quietly changing what every seeded
 * database looks like.
 */
const createUserNode = async (buildObject) => {
  // `password` is a build input — the hash derived from it is what the node carries. `role`
  // selects the Role node to link and was never a property.
  const { password, role, ...properties } = buildObject
  void password
  void role
  return createNode(User, {
    deleted: false,
    disabled: false,
    allowEmbedIframes: false,
    showShoutsPublicly: false,
    emailNotificationsCommentOnObservedPost: true,
    emailNotificationsMention: true,
    emailNotificationsChatMessage: true,
    emailNotificationsGroupMemberJoined: true,
    emailNotificationsGroupMemberLeft: true,
    emailNotificationsGroupMemberRemoved: true,
    emailNotificationsGroupMemberRoleChanged: true,
    emailNotificationsFollowingUsers: true,
    emailNotificationsPostInGroup: true,
    ...properties,
    // After the spread, because `basicUser` sets slug to null explicitly: registration always
    // assigns one, and only the `user` factory computed it — the leaner user factories built
    // users without a slug and neode allowed it.
    slug: (properties.slug as string) || toSlug(properties.name as string),
  })
}

/**
 * A fixture post, carrying its secondary label.
 *
 * `neode.create('Article', ...)` used to do this through `extend('Post', 'Article')`, which is
 * also where the duplicate Article constraints came from. Here the label is just a label.
 */
const createPostNode = async (buildObject) => {
  // Build inputs that were never Post properties: neode dropped them, so they have never
  // existed on a single node in any database.
  const { visibility, imageBlurred, imageAspectRatio, ...properties } = buildObject
  void visibility
  void imageBlurred
  void imageAspectRatio
  const postType = (properties.postType as string) || 'Article'
  const now = new Date().toISOString()
  return createNode(
    Post,
    {
      disabled: false,
      postType,
      sortDate: now,
      ...properties,
    },
    [postType],
  )
}

const uniqueImageUrl = (imageUrl) => {
  const newUrl = new URL(imageUrl)
  newUrl.search = `random=${uuid()}`
  return newUrl.toString()
}

const driver = getDriver()

export const cleanDatabase = async ({ withMigrations } = { withMigrations: false }) => {
  const session = driver.session()

  const clean = `
    MATCH (everything)
    ${withMigrations ? '' : "WHERE NOT 'Migration' IN labels(everything)"}
    DETACH DELETE everything
  `

  try {
    await session.writeTransaction((transaction) => {
      return transaction.run(clean)
    })
  } finally {
    await session.close()
  }
  // Re-seed the default role nodes so factory-built users get their HAS_ROLE edge
  // and authorization resolves from the single-role system (there is no legacy
  // user.role fallback anymore).
  await seedDefaultRoleNodes()
}

// Test helper: replace a user's single HAS_ROLE edge with the named role (role nodes
// are seeded by cleanDatabase). Returns the same node. Used where a test promotes an
// existing user to moderator/admin mid-scenario (the legacy user.role is gone).
export const assignRoleEdge = async (user, roleName: string) => {
  const { id } = await user.toJson()
  const session = driver.session()
  try {
    // Match the target role FIRST: an unknown roleName then yields zero rows, so
    // the DELETE/MERGE never run (no silent edge wipe) and we can fail loudly
    // below — a typo'd role in a test must not corrupt state and pass quietly.
    const result = await session.writeTransaction((transaction) =>
      transaction.run(
        `MATCH (u:User {id: $id})
         MATCH (r:Role {id: $roleName})
         OPTIONAL MATCH (u)-[h:HAS_ROLE]->(:Role) DELETE h
         MERGE (u)-[:HAS_ROLE]->(r)
         RETURN r.id AS roleId`,
        { id, roleName },
      ),
    )
    if (result.records.length === 0) {
      throw new Error(`assignRoleEdge: no Role node found for "${roleName}" (role not seeded?)`)
    }
  } finally {
    await session.close()
  }
  return user
}

Factory.define('category')
  .attr('id', uuid)
  .attr('icon', 'globe')
  .attr('name', 'Global Peace & Nonviolence')
  // Every category in a real database has a slug (constants/categories seeds them with one);
  // the factory never set it, and neode did not mind because the model gave it no default.
  .attr('slug', ['slug', 'name'], (slug, name) => slug || toSlug(name))
  .after(async (buildObject, _options) => {
    return createNode(Category, buildObject)
  })

Factory.define('badge')
  .attr('id', 'trophy_default')
  .attr('type', 'trophy')
  .attr('icon', '/img/badges/trophy_default.svg')
  .attr('description', 'A trophy badge')
  .after(async (buildObject, _options) => {
    // `status: 'permanent'` used to be here. It is not a Badge property and never was — neode
    // dropped every key its model did not know, so the attr had no effect for years.
    return createNode(Badge, buildObject)
  })

Factory.define('image')
  .attr('width', 400)
  .attr('height', 300)
  .attr('blur', 0)
  .attr('alt', faker.lorem.sentence)
  .attr('type', 'image/jpeg')
  .attr('url', null)
  .after(async (buildObject, _options) => {
    if (!buildObject.url) {
      buildObject.url = faker.image.urlPicsumPhotos({
        width: buildObject.width,
        height: buildObject.height,
        blur: buildObject.blur,
      })
    }
    const { width, height, blur, ...properties } = buildObject
    void blur
    // width/height/blur shape the generated URL; only their ratio is stored. They used to be
    // handed to neode and dropped there.
    return createNode(Image, {
      ...properties,
      url: uniqueImageUrl(buildObject.url),
      aspectRatio: width / height,
    })
  })

Factory.define('file')
  .attr('name', faker.lorem.slug)
  .attr('type', 'image/jpeg')
  .attr('url', null)
  .after(async (buildObject, _options) => {
    if (!buildObject.url) {
      buildObject.url = faker.image.urlPicsumPhotos()
    }
    return createNode(File, { ...buildObject, url: uniqueImageUrl(buildObject.url) })
  })

Factory.define('basicUser')
  .option('password', '1234')
  .attrs({
    id: uuid,
    name: faker.person.fullName,
    password: '1234',
    role: 'user',
    termsAndConditionsAgreedVersion: '0.0.1',
    termsAndConditionsAgreedAt: '2019-08-01T10:47:19.212Z',
    allowEmbedIframes: false,
    showShoutsPublicly: false,
    locale: 'en',
  })
  .attr('slug', null)
  .attr('encryptedPassword', ['password'], (password) => {
    // eslint-disable-next-line n/no-sync
    return hashSync(password, 10)
  })

// Single-role: link a freshly built user to their role's :Role node (HAS_ROLE), so
// the role system is populated at creation time and authorization resolves from it.
// The target role node is the `roleName` option when given (e.g. 'owner'), else the
// `role` build attr (a convenience selector — 'admin'/'moderator'/'user' — that is
// NOT persisted; there is no User.role property). Role nodes are seeded by
// cleanDatabase, so the edge is created in tests too. `roles` is the relationship key
// on the User neode model.
const relateUserToRole = async (user, roleName) => {
  if (!roleName) {
    return
  }
  const role = await findNode(Role, 'id', roleName)
  if (role) {
    await user.relateTo(role, 'roles')
  }
}

// Create a User node from the build attrs, then link it to its role node. `role` is
// only a role-node selector (see relateUserToRole), so it is stripped before create.
const createUserWithRole = async (buildObject, roleNameOverride) => {
  const roleName = roleNameOverride ?? buildObject.role
  delete buildObject.role
  const user = await createUserNode(buildObject)
  await relateUserToRole(user, roleName)
  return user
}

Factory.define('userWithoutEmailAddress')
  .extend('basicUser')
  .option('about', faker.lorem.paragraph)
  .option('roleName', null)
  .after(async (buildObject, options) => {
    return createUserWithRole(buildObject, options.roleName)
  })

Factory.define('userWithAboutNull')
  .extend('basicUser')
  .option('about', null)
  .option('roleName', null)
  .after(async (buildObject, options) => {
    return createUserWithRole(buildObject, options.roleName)
  })

Factory.define('userWithAboutEmpty')
  .extend('basicUser')
  .option('about', '')
  .option('roleName', null)
  .after(async (buildObject, options) => {
    return createUserWithRole(buildObject, options.roleName)
  })

Factory.define('user')
  .extend('basicUser')
  .option('about', faker.lorem.paragraph)
  .option('email', null)
  .option('roleName', null)
  .option('avatar', () =>
    Factory.build('image', {
      url: faker.image.avatar(),
    }),
  )
  .after(async (buildObject, options) => {
    // Ensure unique slug
    if (!buildObject.slug) {
      buildObject.slug = await uniqueSlug(
        buildObject.name,
        isUniqueFor({ driver } as unknown as Context, 'User'),
      )
    }
    // Ensure unique email
    if (!options.email) {
      options.email = `${buildObject.slug as string}@example.org`
    }
    const roleName = options.roleName ?? buildObject.role
    delete buildObject.role
    const [user, email, avatar] = await Promise.all([
      createUserNode(buildObject),
      createNode(EmailAddress, { email: options.email }),
      options.avatar,
    ])
    await Promise.all([user.relateTo(email, 'primaryEmail'), email.relateTo(user, 'belongsTo')])
    if (avatar) {
      await user.relateTo(avatar, 'avatar')
    }
    await relateUserToRole(user, roleName)
    return user
  })

Factory.define('post')
  /* .option('categoryIds', [])
  .option('categories', ['categoryIds'], (categoryIds) => {
    if (categoryIds.length) return Promise.all(categoryIds.map((id) => neode.find('Category', id)))
    // there must be at least one category
    return Promise.all([Factory.build('category')])
  }) */
  .option('tagIds', [])
  .option('tags', ['tagIds'], async (tagIds) => {
    return Promise.all(tagIds.map(async (id) => findNode(Tag, 'id', id)))
  })
  .option('authorId', null)
  .option('author', ['authorId'], (authorId) => {
    if (authorId) {
      return findNode(User, 'id', authorId)
    }
    return Factory.build('user')
  })
  .option('pinnedBy', null)
  .option('image', () => Factory.build('image'))
  .attrs({
    id: uuid,
    title: faker.lorem.sentence,
    content: faker.lorem.paragraphs,
    visibility: 'public',
    deleted: false,
    imageBlurred: false,
    imageAspectRatio: 1.333,
    clickedCount: 0,
    viewedTeaserCount: 0,
  })
  .attr('pinned', ['pinned'], (pinned) => {
    // Convert false to null
    return pinned || null
  })
  .attr('slug', ['slug', 'title'], (slug, title) => {
    // Production slug builder: guarantees the models' slug regex /^[a-z0-9_-]+$/
    // for faker titles (apostrophes/commas would otherwise flake the CI with an
    // opaque neode ERROR_VALIDATION).
    return slug || toSlug(title)
  })
  .attr('language', ['language'], (language) => {
    return language || 'en'
  })
  .after(async (buildObject, options) => {
    const [post, author, image, /* categories, */ tags] = await Promise.all([
      createPostNode(buildObject),
      options.author,
      options.image,
      // options.categories,
      options.tags,
    ])
    await Promise.all([
      post.relateTo(author, 'author'),
      post.relateTo(author, 'observes'),
      // Promise.all(categories.map((c) => c.relateTo(post, 'post'))),
      Promise.all(tags.map((t) => t.relateTo(post, 'post'))),
    ])
    if (image) {
      await post.relateTo(image, 'image')
    }
    if (buildObject.pinned) {
      const pinnedBy = await (options.pinnedBy || Factory.build('user', { role: 'admin' }))
      await pinnedBy.relateTo(post, 'pinned')
    }
    return post
  })

Factory.define('group')
  .option('ownerId', null)
  .option('owner', ['ownerId'], (ownerId) => {
    if (ownerId) {
      return findNode(User, 'id', ownerId)
    }
    return Factory.build('user')
  })
  .attrs({
    id: uuid,
    name: faker.company.name,
    about: faker.lorem.sentence,
    description: faker.lorem.paragraphs,
    groupType: 'public',
    actionRadius: 'regional',
    deleted: false,
    disabled: false,
  })
  .attr('slug', ['slug', 'name'], (slug, name) => {
    // Production slug builder: guarantees the Group model's slug regex
    // /^[a-z0-9_-]+$/ for faker company names like "O'Conner Group" or
    // "Erdman, Gutmann and Hand" (which otherwise flake the CI with an opaque
    // neode ERROR_VALIDATION).
    return slug || toSlug(name)
  })
  .attr(
    'descriptionExcerpt',
    ['descriptionExcerpt', 'description'],
    (descriptionExcerpt, description) => {
      return descriptionExcerpt || description
    },
  )
  .after(async (buildObject, options) => {
    const [group, owner] = await Promise.all([createNode(Group, buildObject), options.owner])
    const session = driver.session()
    try {
      await session.writeTransaction((txc) =>
        txc.run(
          `
          MATCH (owner:User {id: $ownerId}), (group:Group {id: $groupId})
          MERGE (owner)-[:CREATED]->(group)
          MERGE (owner)-[membership:MEMBER_OF]->(group)
          SET membership.createdAt = toString(datetime()),
              membership.updatedAt = toString(datetime()),
              membership.role = 'owner'
          `,
          { ownerId: owner.get('id'), groupId: buildObject.id },
        ),
      )
    } finally {
      await session.close()
    }
    return group
  })

Factory.define('comment')
  .option('postId', null)
  .option('post', ['postId'], (postId) => {
    if (postId) {
      return findNode(Post, 'id', postId)
    }
    return Factory.build('post')
  })
  .option('authorId', null)
  .option('author', ['authorId'], (authorId) => {
    if (authorId) {
      return findNode(User, 'id', authorId)
    }
    return Factory.build('user')
  })
  .attrs({
    id: uuid,
    content: faker.lorem.sentence,
    // Came from `default: false` in db/models/Comment.ts. Written out because the resolver
    // writes them too — writerParity.spec.ts is what caught their absence.
    deleted: false,
    disabled: false,
  })
  .after(async (buildObject, options) => {
    const [comment, author, post] = await Promise.all([
      createNode(Comment, buildObject),
      options.author,
      options.post,
    ])
    await Promise.all([
      comment.relateTo(author, 'author'),
      comment.relateTo(post, 'post'),
      post.relateTo(author, 'observes'),
    ])
    return comment
  })

Factory.define('donations')
  .attr('id', uuid)
  .attr('showDonations', true)
  .attr('goal', 15000)
  .attr('progress', 7000)
  .after(async (buildObject, _options) => {
    return createNode(Donations, buildObject)
  })

const emailDefaults = {
  email: faker.internet.email,
  verifiedAt: () => new Date().toISOString(),
}

Factory.define('emailAddress')
  .attrs(emailDefaults)
  .after(async (buildObject, _options) => {
    return createNode(EmailAddress, buildObject)
  })

Factory.define('unverifiedEmailAddress')
  // `.attr(...)` (singular) with an object was a typo: rosie takes a NAME there, so the whole
  // defaults object became one attribute and the node ended up without an email. Nothing
  // noticed, because neode dropped the unknown key and the model required nothing.
  .attrs({ email: faker.internet.email })
  .after(async (buildObject, _options) => {
    return createNode(UnverifiedEmailAddress, buildObject)
  })

const inviteCodeDefaults = {
  code: () => generateInviteCode(),
  createdAt: () => new Date().toISOString(),
  expiresAt: () => null,
}

Factory.define('inviteCode')
  .attrs(inviteCodeDefaults)
  .option('groupId', null)
  .option('group', ['groupId'], async (groupId) => {
    if (groupId) {
      return findNode(Group, 'id', groupId)
    }
  })
  .option('generatedById', null)
  .option('generatedBy', ['generatedById'], (generatedById) => {
    if (generatedById) {
      return findNode(User, 'id', generatedById)
    }
    return Factory.build('user')
  })
  .after(async (buildObject, options) => {
    const [inviteCode, generatedBy, group] = await Promise.all([
      createNode(InviteCode, buildObject),
      options.generatedBy,
      options.group,
    ])
    await inviteCode.relateTo(generatedBy, 'generated')
    if (group) {
      await inviteCode.relateTo(group, 'invitesTo')
    }
    return inviteCode
  })

Factory.define('location')
  .attrs({
    name: 'Germany',
    namePT: 'Alemanha',
    nameDE: 'Deutschland',
    nameES: 'Alemania',
    nameNL: 'Duitsland',
    namePL: 'Niemcy',
    nameFR: 'Allemagne',
    nameIT: 'Germania',
    nameEN: 'Germany',
    id: 'country.10743216036480410',
    type: 'country',
  })
  .after(async (buildObject, _options) => {
    return createNode(Location, buildObject)
  })

Factory.define('report').after(async (buildObject, _options) => {
  return createNode(Report, {
    id: uuid(),
    rule: 'latestReviewUpdatedAtRules',
    closed: false,
    ...buildObject,
  })
})

Factory.define('tag')
  .attrs({
    // The id IS the hashtag — that is how the hashtag middleware writes them. The attr used to
    // be called `name`, which Tag has never had: neode dropped it, so every tag this factory
    // built went in WITHOUT an id. Callers that pass `{ id }` were unaffected, which is why it
    // stayed unnoticed.
    id: '#human-connection',
    deleted: false,
    disabled: false,
  })
  .after(async (buildObject, _options) => {
    return createNode(Tag, buildObject)
  })

Factory.define('socialMedia')
  .attrs({
    id: uuid,
    url: 'https://mastodon.social/@Gargron',
  })
  .after(async (buildObject, _options) => {
    return createNode(SocialMedia, buildObject)
  })

export default Factory
