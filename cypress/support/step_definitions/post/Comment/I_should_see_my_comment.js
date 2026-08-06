import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see my comment', () => {
  cy.get('article.comment-card p')
    .should('contain', 'Ocelot.social rocks')
    .get('.user-avatar span.name')
    .should('contain', 'Peter Pan') // specific enough
    .get('.avatar-image img')
    .should('have.attr', 'src')
    .and('contain', 'https://') // some url
    .get('.user-avatar .info > .text')
    .should('contain', 'today at')
})
