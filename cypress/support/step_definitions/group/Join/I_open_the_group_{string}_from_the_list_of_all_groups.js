import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// A group the user is not in yet is on the "all groups" tab, not on "my groups".
defineStep('I open the group {string} from the list of all groups', (name) => {
  cy.get('[data-test="allGroups-tab-click"]').click()
  cy.contains('.group-teaser', name, { timeout: 15000 }).click()
})
