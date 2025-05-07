import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I have added the social media link {string}', (link) => {
  cy.visit('/settings/my-social-media')
    .get('button.--filled')
    .click()
    .get('#editSocialMedia')
    .type(link)
    .get('button.--filled')
    .click()
  cy.get('.ds-list-item-content > a')
    .contains(link)
})
