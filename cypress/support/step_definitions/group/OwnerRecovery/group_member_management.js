import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// The member list on /groups/edit/<id>/members renders one row per member
// (data-test="group-member-<userId>"), with the role picker and the remove button inside it.
const memberRow = (userId) => cy.get(`[data-test="group-member-${userId}"]`)

defineStep('I elevate in the group with the reason {string}', (reason) => {
  cy.get('[data-test="elevation-reason"] input').type(reason)
  cy.get('[data-test="elevation-start"]').click()
})

defineStep('the member {string} offers no role picker and no remove button', (userId) => {
  memberRow(userId).should('exist')
  memberRow(userId).find('[data-test="group-member-role"]').should('not.exist')
  memberRow(userId).find('[data-test="group-member-remove"]').should('not.exist')
})

defineStep('I give the member {string} the group role {string}', (userId, roleName) => {
  // The option has to be there first: it only is once the role definitions were read, which is
  // what the elevation unlocks.
  memberRow(userId)
    .find(`[data-test="group-member-role"] option[value="${roleName}"]`)
    .should('exist')
  memberRow(userId).find('[data-test="group-member-role"]').select(roleName)
})

defineStep('the member {string} has the group role {string}', (userId, roleName) => {
  // An owner row is still a picker here, because the elevated admin outranks it.
  memberRow(userId).find('[data-test="group-member-role"]').should('have.value', roleName)
})

defineStep('I remove the member {string} from the group', (userId) => {
  memberRow(userId).find('[data-test="group-member-remove"]').click()
  cy.get('[data-testid="os-modal-confirm"]').click()
})

defineStep('the member {string} is no longer listed', (userId) => {
  memberRow(userId).should('not.exist')
})
