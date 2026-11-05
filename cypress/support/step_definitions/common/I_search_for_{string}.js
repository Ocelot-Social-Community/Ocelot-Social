import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Waits for the search's own request, not just any GraphQL request: the page keeps talking to the
// API (online status, notifications) and the first of those would otherwise end the wait early.
defineStep('I search for {string}', (value) => {
  cy.intercept('POST', /\/api$/, (req) => {
    if (req.body?.query?.includes('searchResults')) req.alias = 'searchResults'
  })
  cy.get('.searchable-input .ds-select input').focus().type(value)
  cy.wait('@searchResults')
})
