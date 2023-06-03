import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I click on "Report Post" from the content menu of the post', () => {
  cy.contains('.base-card', 'The Truth about the Holocaust')
    .find('.content-menu .base-button')
    .click()
  
  cy.get('.popover .ds-menu-item-link')
    .contains('Report Post')
    .click()
})
