import { When, Then } from 'cypress-cucumber-preprocessor/steps'

/* global cy */

When('I click on the {string} link', link => {
  cy.get('a')
    .contains(link)
    .click()
})

Then('I should be on the {string} page', page => {
  cy.location()
    .should(loc => {
      expect(loc.pathname).to.eq(page)
    })
    .get('h2')
    .should('contain', 'Social media')
})