import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the post was saved successfully', () => {
  cy.task('getValue', 'lastPost').then(lastPost => {
    cy.get('.base-card > .title').should('contain', lastPost.title)
    cy.get('.content').should('contain', lastPost.content)
  })
})
