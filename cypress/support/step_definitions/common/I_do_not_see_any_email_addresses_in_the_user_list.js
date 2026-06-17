import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// The user list renders each e-mail as a mailto link; a viewer without
// user.email.readAny gets no email column (and the query omits the field), so no
// mailto links exist. Robust against the search placeholder, which also mentions
// "e-mail" as free text.
defineStep('I do not see any email addresses in the user list', () => {
  cy.get('table').should('exist')
  cy.get('a[href^="mailto:"]').should('not.exist')
})
