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

When('I add a social media link', () => {
  cy.get('input#addSocialMedia')
    .type('https://freeradical.zone/peter-pan')
    .get('button')
    .contains('Add link')
    .click()
})

Then('it gets saved successfully', () => {
  cy.get('.iziToast-message')
    .should('contain', 'Added social media')
})

Then('the new social media link shows up on the page', () => {
  cy.get('a[href="https://freeradical.zone/peter-pan"]')
    .should('have.length', 1)
})

Given('I have added a social media link', () => {
  cy.openPage('/settings/my-social-media')
    .get('input#addSocialMedia')
    .type('https://freeradical.zone/peter-pan')
    .get('button')
    .contains('Add link')
    .click()
})

Then('they should be able to see my social media links', () => {
  cy.get('.base-card')
    .contains('Where else can I find Peter Pan?')
    .get('a[href="https://freeradical.zone/peter-pan"]')
    .should('have.length', 1)
})

When('I delete a social media link', () => {
  cy.get(".base-button[title='Delete']")
    .click()
})

Then('it gets deleted successfully', () => {
  cy.get('.iziToast-message')
    .should('contain', 'Deleted social media')
})

When('I start editing a social media link', () => {
  cy.get(".base-button[title='Edit']")
    .click()
})

Then('I can cancel editing', () => {
  cy.get('button#cancel')
    .click()
    .get('input#editSocialMedia')
    .should('have.length', 0)
})

When('I edit and save the link', () => {
  cy.get('input#editSocialMedia')
    .clear()
    .type('https://freeradical.zone/tinkerbell')
    .get('button')
    .contains('Save')
    .click()
})

Then('the new url is displayed', () => {
  cy.get("a[href='https://freeradical.zone/tinkerbell']")
    .should('have.length', 1)
})

Then('the old url is not displayed', () => {
  cy.get("a[href='https://freeradical.zone/peter-pan']")
    .should('have.length', 0)
})
