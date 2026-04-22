import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I remember the current post URL', () => {
  cy.location('pathname').then((pathname) => {
    cy.wrap(pathname).as('rememberedPostUrl')
  })
})
