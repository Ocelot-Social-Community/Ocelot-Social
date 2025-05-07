import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('they should be able to see my social media links', () => {
  cy.get('.social-media-bc')
    .scrollIntoView()
    .contains('Peter Pan')
    .get('a[href="https://freeradical.zone/peter-pan"]')
})
