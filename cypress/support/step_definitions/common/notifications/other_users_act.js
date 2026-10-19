import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import { actAs, postIdOf } from '../../../actAs'
import './../../../factories'

// What other users do, through the real API (see cypress/support/actAs.js): these are the actions
// that notify. The scenario's own user acts in the browser.

const createPost = `
  mutation ($title: String!, $content: String!, $groupId: ID) {
    CreatePost(title: $title, content: $content, groupId: $groupId) { id }
  }
`

const createComment = `
  mutation ($postId: ID!, $content: String!) {
    CreateComment(postId: $postId, content: $content) { id }
  }
`

const muteUser = `
  mutation ($id: ID!) {
    muteUser(id: $id) { id }
  }
`

defineStep('{string} posts {string} in the group {string}', (slug, title, groupId) => {
  actAs(slug, createPost, {
    title,
    content: `${title} — everything about it in this post.`,
    groupId,
  })
})

defineStep('{string} writes the post {string}', (slug, title) => {
  actAs(slug, createPost, { title, content: `${title} — everything about it in this post.` })
})

defineStep('{string} comments {string} on the post {string}', (slug, content, title) => {
  postIdOf(title).then(({ id }) => actAs(slug, createComment, { postId: id, content }))
})

defineStep('{string} mutes {string}', (slug, mutedSlug) => {
  cy.fixtures()
    .firstOf('User', { slug: mutedSlug })
    .then((muted) => actAs(slug, muteUser, { id: muted.get('id') }))
})

// A user counts as online for 90 s after the webapp last reported them (isUserOnline.ts), logout
// or not. Instead of waiting that out, a scenario moves their last activity into the past.
defineStep('{string} has not been active for a while', (slug) => {
  cy.fixtures().then((fixtures) =>
    fixtures.cypher(
      `MATCH (user:User {slug: $slug})
       SET user.lastOnlineStatus = 'online',
           user.awaySince = null,
           user.lastActiveAt = toString(datetime() - duration({minutes: 10}))`,
      { slug },
    ),
  )
})
