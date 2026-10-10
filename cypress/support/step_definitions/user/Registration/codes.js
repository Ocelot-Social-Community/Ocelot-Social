import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../../factories'

// The codes the server would mail, read where it stores them. The newest one, in case a slide
// asked twice.
const registrationCode = (email) =>
  cy.fixtures().then((fixtures) =>
    fixtures
      .cypher(
        `MATCH (address:EmailAddress {email: $email})
         RETURN address.nonce AS nonce ORDER BY address.createdAt DESC LIMIT 1`,
        { email },
      )
      .then((result) => result.records[0].get('nonce')),
  )

const resetCode = (email) =>
  cy.fixtures().then((fixtures) =>
    fixtures
      .cypher(
        `MATCH (:EmailAddress {email: $email})<-[:PRIMARY_EMAIL]-(:User)-[:REQUESTED]->(reset:PasswordReset)
         RETURN reset.nonce AS nonce ORDER BY reset.issuedAt DESC LIMIT 1`,
        { email },
      )
      .then((result) => result.records[0].get('nonce')),
  )

// A code of the same shape that is not the one issued — so the form accepts it and the SERVER
// has to refuse it.
const otherThan = (code) => code.replace(/./g, (char) => (char === '0' ? '1' : '0'))

const next = () => cy.get('[data-test="next-button"]').click()

defineStep('{string} has the invite code {string}', (slug, code) => {
  cy.factory().build('inviteCode', { code }, { generatedById: slug })
})

defineStep('I enter the invite code {string}', (code) => {
  cy.get('input#inviteCode', { timeout: 15000 }).type(code)
  next()
})

defineStep('I enter the e-mail address {string}', (email) => {
  cy.get('input#email', { timeout: 15000 }).type(email)
  next()
})

defineStep('I enter the code that was sent to {string}', (email) => {
  cy.get('input#nonce', { timeout: 15000 }).should('be.visible')
  registrationCode(email).then((code) => {
    cy.get('input#nonce').type(code)
    next()
  })
})

defineStep('I enter a wrong code for {string}', (email) => {
  cy.get('input#nonce', { timeout: 15000 }).should('be.visible')
  registrationCode(email).then((code) => {
    cy.get('input#nonce').type(otherThan(code))
    next()
  })
})

defineStep('I am still asked for the code', () => {
  cy.get('input#nonce').should('be.visible')
  cy.location('pathname').should('include', 'registration')
})

defineStep('I create my account as {string} with the password {string}', (name, password) => {
  cy.get('input#name', { timeout: 15000 }).type(name)
  cy.get('input#password').type(password)
  cy.get('input#passwordConfirmation').type(password)
  // The terms and the data protection declaration — both required.
  cy.get('input#checkbox0').check()
  cy.get('input#checkbox1').check()
  next()
})

defineStep('I see that registration is closed', () => {
  cy.contains('No Public Registration', { timeout: 15000 })
  cy.get('input#email').should('not.exist')
})

defineStep('I request a password reset for {string}', (email) => {
  cy.get('input#email', { timeout: 15000 }).type(email)
  cy.get('button[type="submit"]').click()
  cy.location('pathname', { timeout: 15000 }).should('include', 'enter-nonce')
})

defineStep('I enter the reset code that was sent to {string}', (email) => {
  resetCode(email).then((code) => {
    cy.get('input#nonce').type(code)
    cy.get('button[type="submit"]').click()
  })
  cy.location('pathname', { timeout: 15000 }).should('include', 'change-password')
})

defineStep('I enter a wrong reset code for {string}', (email) => {
  resetCode(email).then((code) => {
    cy.get('input#nonce').type(otherThan(code))
    cy.get('button[type="submit"]').click()
  })
  cy.location('pathname', { timeout: 15000 }).should('include', 'change-password')
})

defineStep('I choose the new password {string}', (password) => {
  cy.get('input#password').type(password)
  cy.get('input#passwordConfirmation').type(password)
  cy.get('button[type="submit"]').click()
})
