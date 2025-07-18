import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see my comment', () => {
  cy.get('article.comment-card p')
    .should('contain', 'Ocelot.social rocks')
    .get('.user-teaser span.name')
    .should('contain', 'Peter Pan') // specific enough
    .get('.profile-avatar img')
    .should('have.attr', 'src')
    .and('contain', 'https://') // some url
    .get('.user-teaser .info > .text')
    .should('contain', 'today at')
})
