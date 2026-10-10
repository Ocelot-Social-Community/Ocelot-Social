import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Asked of the API rather than the login page: what matters is which password the account
// takes now, not the page in between.
const login = (email, password) =>
  cy.request({
    method: 'POST',
    url: 'http://localhost:4000',
    body: {
      query: 'mutation ($email: String!, $password: String!) { login(email: $email, password: $password) }',
      variables: { email, password },
    },
  })

defineStep('I can log in as {string} with {string}', (email, password) => {
  login(email, password).then(({ body }) => {
    expect(body.errors, `login of ${email}`).to.be.undefined
    expect(body.data.login).to.be.a('string')
  })
})

defineStep('I cannot log in as {string} with {string}', (email, password) => {
  login(email, password).then(({ body }) => {
    expect(body.errors, `login of ${email} must be refused`).to.have.length.greaterThan(0)
  })
})

defineStep('I am logged in with username {string}', (name) => {
  cy.get('.avatar-menu', { timeout: 30000 }).click()
  cy.get('.avatar-menu-popover').contains(name)
  cy.get('.avatar-menu').click()
})
