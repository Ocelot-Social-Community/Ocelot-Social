import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on {string}', element => {
  const elementSelectors = {
    'submit button': 'button[name=submit]',
    'create post button': '.post-add-button',
    'create group button': '.group-add-button',
    'save button': 'button[type=submit]',
    'the first post': '.post-teaser:first-child',
    'comment button': 'button[type=submit]',
    'reply button': '.reply-button',
    'security menu': 'a[href="/settings/security"]',
    'pin post': '.ds-menu-item:first-child',
    'Moderation': 'a[href="/moderation"]',
  }

  if (element === 'Moderation') {
    cy.intercept({
      method: 'POST',
      url: '/api',
      hostname: 'localhost',
    }, (req) => {
      if (req.body && req.body.query && req.body.query.includes('query ($orderBy: ReportOrdering')) {
        req.alias = 'reportsQuery'
      }
    })
  }

  cy.get(elementSelectors[element])
    .click()
    .wait(750)
})
