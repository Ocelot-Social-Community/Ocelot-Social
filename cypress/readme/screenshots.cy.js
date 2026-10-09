// The screenshots in the README, taken from the demo network (`npm run db:seed`) by the
// `readme-screenshots` entry of the e2e workflow and published to the `readme-screenshots` branch
// on every push to master — so the pictures follow the app instead of ageing in the repository.
//
// A plain Cypress spec on purpose, outside the cucumber features: their support files wipe the
// database before every scenario, and these pictures need the seeded network. Nothing here
// asserts behaviour beyond "the page has rendered its content"; the features do that.

const GRAPHQL_URI = 'http://localhost:4000'
// The seed's accounts, all with the factory password (backend/src/db/seed.ts).
const USER = 'user@example.org'
const ADMIN = 'admin@example.org'

const login = (email) => {
  cy.request('POST', GRAPHQL_URI, {
    query: 'mutation ($email: String!, $password: String!) { login(email: $email, password: $password) }',
    variables: { email, password: '1234' },
  }).then(({ body }) => {
    expect(body.errors, `login of ${email}`).to.be.undefined
    cy.setCookie('ocelot-social-token', body.data.login)
  })
}

// The viewport, not the whole page: a README picture shows what a visitor sees first.
const shoot = (name) => cy.screenshot(name, { capture: 'viewport', overwrite: true })

// Fonts, images and avatars arrive after the content; a picture taken at the first paint shows
// placeholders.
const settle = () => cy.wait(1500)

describe('README screenshots', () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
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
    cy.visit('/')
    cy.get('.post-teaser a', { timeout: 60000 }).first().click()
    cy.location('pathname', { timeout: 60000 }).should('match', /^\/post\//)
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
