import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the post with title {string} has a ribbon for pinned posts', (title) => {
  cy.get('.post-teaser').contains(title)
    .parent()
    .parent()
    .find('.os-ribbon.os-ribbon--pinned')
    .should('contain', 'Announcement')
})
