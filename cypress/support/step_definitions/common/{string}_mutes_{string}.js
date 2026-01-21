import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../factories'

defineStep('{string} mutes {string}', (muterName, mutedName) => {
  cy.neode()
    .firstOf('User', { name: mutedName })
    .then(mutedUser => {
      cy.neode()
        .firstOf('User', { name: muterName })
        .then(muterUser => {
          cy.wrap(muterUser).relateTo(mutedUser, 'muted')
        })
    })
})
