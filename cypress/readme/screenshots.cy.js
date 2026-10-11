// The screenshots in the README, taken from the demo network (`npm run db:seed`) by the
// `readme-screenshots` entry of the e2e workflow and published to the `readme-screenshots` branch
// on every push to master — so the pictures follow the app instead of ageing in the repository.
//
// A plain Cypress spec on purpose, outside the cucumber features: their support files wipe the
// database before every scenario, and these pictures need the seeded network. Nothing here
// asserts behaviour beyond "the page has rendered its content"; the features do that.

// The features' service-worker experiment (page-load hang, #10414) lives among their step
// definitions, which a plain spec does not load — so this one still ran with the worker, open to
// the hang the experiment is about. The pictures do not show the worker either way.
import '../support/step_definitions/common/no_service_worker'

const GRAPHQL_URI = 'http://localhost:4000'
// The seed's accounts, all with the factory password (backend/src/db/seed.ts).
const USER = 'user@example.org'
const ADMIN = 'admin@example.org'

// The seed's accounts agreed to an older version of the terms than the branding asks for, so every
// page would send them to the confirmation first. Agreed once per account, through the page, so
// this keeps working whatever the current version is.
const agreed = new Set()

const login = (email) => {
  cy.request('POST', GRAPHQL_URI, {
    query: 'mutation ($email: String!, $password: String!) { login(email: $email, password: $password) }',
    variables: { email, password: '1234' },
  }).then(({ body }) => {
    expect(body.errors, `login of ${email}`).to.be.undefined
    cy.setCookie('ocelot-social-token', body.data.login)
  })
  if (!agreed.has(email)) {
    cy.visit('/terms-and-conditions-confirm')
    cy.get('#checkbox', { timeout: 60000 }).check()
    cy.get('label[for="checkbox"] ~ button').click()
    cy.location('pathname', { timeout: 60000 }).should('not.include', 'terms-and-conditions')
    cy.then(() => agreed.add(email))
  }
}

// The viewport, not the whole page: a README picture shows what a visitor sees first. Without the
// page's own scrollbar, which only says that there is more below.
const shoot = (name) => {
  cy.document().then((doc) => {
    const style = doc.createElement('style')
    style.textContent = '::-webkit-scrollbar { display: none } html { scrollbar-width: none }'
    doc.head.appendChild(style)
  })
  cy.screenshot(name, { capture: 'viewport', overwrite: true })
}

// Fonts, images and avatars arrive after the content; a picture taken at the first paint shows
// placeholders.
const settle = () => cy.wait(1500)

describe('README screenshots', () => {
  beforeEach(() => {
    // Narrower than a desktop, so the README's scaled-down pictures stay readable; the window it
    // needs is set in cypress.config.js (README_SCREENSHOTS).
    cy.viewport(1024, 640)
    cy.setCookie('locale', 'en')
  })

  it('the news feed', () => {
    login(USER)
    cy.visit('/')
    cy.get('.post-teaser', { timeout: 60000 }).should('have.length.greaterThan', 2)
    settle()
    shoot('feed')
  })

  it('a post with its comments', () => {
    login(USER)
    // The post with the most comments, so the picture shows a conversation. Asked of the API: a
    // teaser opens its post through a click handler, not a link.
    cy.request('POST', GRAPHQL_URI, {
      query: '{ Post(first: 50) { id slug commentsCount } }',
    }).then(({ body }) => {
      const [post] = [...body.data.Post].sort((a, b) => b.commentsCount - a.commentsCount)
      cy.visit(`/post/${post.id}/${post.slug}`)
    })
    cy.get('.post-page', { timeout: 60000 }).should('be.visible')
    settle()
    // Its title image alone fills the viewport. Scrolled to the title, with the end of the image and
    // the author still above it, so the picture shows the text and the conversation.
    cy.get('.post-page h1.title').then(([title]) => {
      const win = title.ownerDocument.defaultView
      win.scrollTo(0, title.getBoundingClientRect().top + win.scrollY - 220)
    })
    settle()
    shoot('post')
  })

  it('the groups', () => {
    login(USER)
    cy.visit('/groups')
    cy.get('.group-teaser', { timeout: 60000 }).should('have.length.greaterThan', 1)
    settle()
    shoot('groups')
  })

  it('a group', () => {
    login(USER)
    cy.visit('/groups')
    cy.get('.group-teaser', { timeout: 60000 }).first().click()
    cy.location('pathname', { timeout: 60000 }).should('match', /^\/groups\/[^/]+\/[^/]+/)
    settle()
    shoot('group')
  })

  it('the map', () => {
    login(USER)
    cy.visit('/map')
    cy.get('.mapboxgl-canvas', { timeout: 60000 }).should('be.visible')
    // Tiles stream in after the canvas exists.
    cy.wait(5000)
    shoot('map')
  })

  it('the chat', () => {
    login(USER)
    cy.visit('/chat')
    cy.get('.chat-page', { timeout: 60000 }).should('be.visible')
    // The chat is a web component; its messages arrive after the room list.
    cy.get('vue-advanced-chat', { timeout: 60000 })
      .shadow()
      .find('.vac-message-wrapper', { timeout: 60000 })
      .should('have.length.greaterThan', 0)
    settle()
    shoot('chat')
  })

  it('the role templates a network gives its groups', () => {
    login(ADMIN)
    cy.visit('/admin/group-roles')
    cy.get('[data-test="switch-members-post"]', { timeout: 60000 }).should('exist')
    settle()
    shoot('group-rights')
  })
})
