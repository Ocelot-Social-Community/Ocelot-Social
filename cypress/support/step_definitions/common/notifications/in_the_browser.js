import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import { postIdOf } from '../../../actAs'

// Online the way a user is: the webapp reports it when a page loads (plugins/onlineStatus.js).
// Waiting for that report is what makes the backend see the user as online afterwards.
defineStep('I am online on page {string}', (path) => {
  cy.intercept('POST', '/api', (req) => {
    if (req.body && typeof req.body.query === 'string' && req.body.query.includes('updateOnlineStatus')) {
      req.alias = 'onlineStatus'
    }
  })
  cy.visit(path)
  cy.wait('@onlineStatus').its('response.statusCode').should('eq', 200)
})

defineStep('I open the post {string}', (title) => {
  postIdOf(title).then(({ id, slug }) => cy.visit(`/post/${id}/${slug}`))
})

defineStep('I see no unread notifications in the top menu', () => {
  cy.get('.notifications-menu:visible').should('exist')
  cy.get('.notifications-menu .os-counter-icon .os-counter-icon__count').should('not.exist')
})

// The bell button below the post: filled while I observe it.
defineStep('I stop observing the post', () => {
  cy.get('button[aria-label$="observed"]').click()
})
