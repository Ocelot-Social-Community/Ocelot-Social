import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Generic existence check by data-test attribute (e.g. role tabs on /admin/roles).
defineStep('I see the element with test id {string}', (testId) => {
  cy.get(`[data-test="${testId}"]`).should('exist')
})

defineStep('I select the role {string}', (roleName) => {
  cy.get(`[data-test="role-tab-${roleName}"]`).click()
})

// `assertion` is a Cypress chainer string, e.g. "be.checked" / "not.be.checked".
defineStep(
  'the permission {string} for role {string} should {string}',
  (permission, roleName, assertion) => {
    cy.get(`[data-test="role-${roleName}-perm-${permission}"]`).should(assertion)
  },
)

defineStep('I disable the permission {string} for role {string}', (permission, roleName) => {
  cy.get(`[data-test="role-${roleName}-perm-${permission}"]`).uncheck()
})

defineStep('I save the role {string}', (roleName) => {
  cy.get(`[data-test="role-${roleName}-save"]`).click()
})
