import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import '../../factories'

defineStep('{string} blocks {string}', (blockerName, blockedName) => {
  cy.neode()
    .firstOf('User', { name: blockedName })
    .then(mutedUser => {
      cy.neode()
        .firstOf('User', { name: blockerName })
        .then(muterUser => {
          cy.wrap(muterUser).relateTo(mutedUser, 'muted')
        })
    })
})
