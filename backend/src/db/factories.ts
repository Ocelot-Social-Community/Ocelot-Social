/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { faker } from '@faker-js/faker'
import { hashSync } from 'bcryptjs'
import { Factory } from 'rosie'
import slugify from 'slug'
import { v4 as uuid } from 'uuid'

import CONFIG from '@config/index'
import generateInviteCode from '@schema/resolvers/helpers/generateInviteCode'

import { getDriver, getNeode } from './neo4j'

const neode = getNeode()

const uniqueImageUrl = (imageUrl) => {
  const newUrl = new URL(imageUrl, CONFIG.CLIENT_URI)
  newUrl.search = `random=${uuid()}`
  return newUrl.toString()
}

export const cleanDatabase = async ({ withMigrations } = { withMigrations: false }) => {
  const driver = getDriver()
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
    session.close()
  }
}

Factory.define('category')
  .attr('id', uuid)
  .attr('icon', 'globe')
  .attr('name', 'Global Peace & Nonviolence')
  .after((buildObject, _options) => {
    return neode.create('Category', buildObject)
  })

Factory.define('badge')
  .attr('type', 'crowdfunding')
  .attr('status', 'permanent')
  .after((buildObject, _options) => {
    return neode.create('Badge', buildObject)
  })

Factory.define('image')
  .attr('url', faker.image.url)
  .attr('aspectRatio', 1.3333333333333333)
  .attr('alt', faker.lorem.sentence)
  .attr('type', 'image/jpeg')
  .after((buildObject, _options) => {
    const { url: imageUrl } = buildObject
    if (imageUrl) buildObject.url = uniqueImageUrl(imageUrl)
    return neode.create('Image', buildObject)
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
  .attr('slug', ['slug', 'name'], (slug, name) => {
    return slug || slugify(name, { lower: true })
  })
  .attr('encryptedPassword', ['password'], (password) => {
    return hashSync(password, 10)
  })

Factory.define('userWithoutEmailAddress')
  .extend('basicUser')
  .option('about', faker.lorem.paragraph)
  .after(async (buildObject, _options) => {
    return neode.create('User', buildObject)
  })

Factory.define('userWithAboutNull')
  .extend('basicUser')
  .option('about', null)
  .after(async (buildObject, _options) => {
    return neode.create('User', buildObject)
  })

Factory.define('userWithAboutEmpty')
  .extend('basicUser')
  .option('about', '')
  .after(async (buildObject, _options) => {
    return neode.create('User', buildObject)
  })

Factory.define('user')
  .extend('basicUser')
  .option('about', faker.lorem.paragraph)
  .option('email', faker.internet.exampleEmail)
  .option('avatar', () =>
    Factory.build('image', {
      url: faker.image.avatar(),
    }),
  )
  .after(async (buildObject, options) => {
    const [user, email, avatar] = await Promise.all([
      neode.create('User', buildObject),
      neode.create('EmailAddress', { email: options.email }),
      options.avatar,
    ])
    await Promise.all([user.relateTo(email, 'primaryEmail'), email.relateTo(user, 'belongsTo')])
    if (avatar) await user.relateTo(avatar, 'avatar')
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
  .option('tags', ['tagIds'], (tagIds) => {
    return Promise.all(tagIds.map((id) => neode.find('Tag', id)))
  })
  .option('authorId', null)
  .option('author', ['authorId'], (authorId) => {
    if (authorId) return neode.find('User', authorId)
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
  .attr('contentExcerpt', ['contentExcerpt', 'content'], (contentExcerpt, content) => {
    return contentExcerpt || content
  })
  .attr('slug', ['slug', 'title'], (slug, title) => {
    return slug || slugify(title, { lower: true })
  })
  .attr('language', ['language'], (language) => {
    return language || 'en'
  })
  .after(async (buildObject, options) => {
    const [post, author, image, /* categories, */ tags] = await Promise.all([
      neode.create('Article', buildObject),
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
    if (image) await post.relateTo(image, 'image')
    if (buildObject.pinned) {
      const pinnedBy = await (options.pinnedBy || Factory.build('user', { role: 'admin' }))
      await pinnedBy.relateTo(post, 'pinned')
    }
    return post
  })

Factory.define('comment')
  .option('postId', null)
  .option('post', ['postId'], (postId) => {
    if (postId) return neode.find('Post', postId)
    return Factory.build('post')
  })
  .option('authorId', null)
  .option('author', ['authorId'], (authorId) => {
    if (authorId) return neode.find('User', authorId)
    return Factory.build('user')
  })
  .attrs({
    id: uuid,
    content: faker.lorem.sentence,
  })
  .attr('contentExcerpt', ['contentExcerpt', 'content'], (contentExcerpt, content) => {
    return contentExcerpt || content
  })
  .after(async (buildObject, options) => {
    const [comment, author, post] = await Promise.all([
      neode.create('Comment', buildObject),
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
  .after((buildObject, _options) => {
    return neode.create('Donations', buildObject)
  })

const emailDefaults = {
  email: faker.internet.email,
  verifiedAt: () => new Date().toISOString(),
}

Factory.define('emailAddress')
  .attrs(emailDefaults)
  .after((buildObject, _options) => {
    return neode.create('EmailAddress', buildObject)
  })

Factory.define('unverifiedEmailAddress')
  .attr(emailDefaults)
  .after((buildObject, _options) => {
    return neode.create('UnverifiedEmailAddress', buildObject)
  })

const inviteCodeDefaults = {
  code: () => generateInviteCode(),
  createdAt: () => new Date().toISOString(),
  expiresAt: () => null,
}

Factory.define('inviteCode')
  .attrs(inviteCodeDefaults)
  .option('generatedById', null)
  .option('generatedBy', ['generatedById'], (generatedById) => {
    if (generatedById) return neode.find('User', generatedById)
    return Factory.build('user')
  })
  .after(async (buildObject, options) => {
    const [inviteCode, generatedBy] = await Promise.all([
      neode.create('InviteCode', buildObject),
      options.generatedBy,
    ])
    await Promise.all([inviteCode.relateTo(generatedBy, 'generated')])
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
  .after((buildObject, _options) => {
    return neode.create('Location', buildObject)
  })

Factory.define('report').after((buildObject, _options) => {
  return neode.create('Report', buildObject)
})

Factory.define('tag')
  .attrs({
    name: '#human-connection',
  })
  .after((buildObject, _options) => {
    return neode.create('Tag', buildObject)
  })

Factory.define('socialMedia')
  .attrs({
    url: 'https://mastodon.social/@Gargron',
  })
  .after((buildObject, _options) => {
    return neode.create('SocialMedia', buildObject)
  })

export default Factory
