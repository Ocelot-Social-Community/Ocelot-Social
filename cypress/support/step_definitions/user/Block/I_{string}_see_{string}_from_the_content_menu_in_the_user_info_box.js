import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I {string} see {string} from the content menu in the user info box', (condition, link) => {
  cy.get('.user-content-menu [data-test="content-menu-button"]').click()
  cy.get('.popover .os-menu-item-link')
    .should(condition === 'should' ? 'contain' : 'not.contain', link)
})
