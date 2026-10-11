import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Opening a post one may not read answers 404 — the right answer, which cy.visit would count as a
// failure. The raw response is checked as well: the server renders this page, so the post must
// not be in the HTML it sends, whatever the browser then does with it.
defineStep('I open the link {string}', (path) => {
  cy.request({ url: path, failOnStatusCode: false }).then((response) => {
    cy.wrap(response.body, { log: false }).as('rawPage')
  })
  cy.visit(path, { failOnStatusCode: false })
})
