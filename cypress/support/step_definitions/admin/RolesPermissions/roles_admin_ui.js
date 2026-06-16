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

defineStep('I enable the permission {string} for role {string}', (permission, roleName) => {
  cy.get(`[data-test="role-${roleName}-perm-${permission}"]`).check()
})

defineStep('I save the role {string}', (roleName) => {
  cy.get(`[data-test="role-${roleName}-save"]`).click()
})

// --- role creation / deletion lifecycle ---

defineStep('I start creating a role named {string}', (name) => {
  cy.get('[data-test="role-add"]').click()
  cy.get('[data-test="new-role-name"]').type(name)
})

defineStep('I confirm creating the role', () => {
  cy.get('[data-test="new-role-create"]').click()
})

defineStep('I delete the role {string}', (roleName) => {
  cy.get(`[data-test="role-${roleName}-delete"]`).click()
})

defineStep('the delete button for role {string} is disabled', (roleName) => {
  cy.get(`[data-test="role-${roleName}-delete"]`).should('be.disabled')
})

defineStep('I do not see the element with test id {string}', (testId) => {
  cy.get(`[data-test="${testId}"]`).should('not.exist')
})
