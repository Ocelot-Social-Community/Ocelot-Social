import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on {string} from the content menu in the user info box',
  button => {
    cy.get('.user-content-menu button').click()
    cy.get('.popover .ds-menu-item-link')
      .contains(button)
      .click({
        force: true
      })
    }
)
