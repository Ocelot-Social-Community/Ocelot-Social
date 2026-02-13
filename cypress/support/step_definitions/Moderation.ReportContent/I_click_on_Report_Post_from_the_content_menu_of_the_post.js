import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on "Report Post" from the content menu of the post', () => {
  cy.contains('.base-card', 'The Truth about the Holocaust')
    .find('[data-test="content-menu-button"]')
    .click()
  
  cy.get('.popover .ds-menu-item-link')
    .contains('Report Post')
    .click()
})
