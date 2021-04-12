import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps'
import { VERSION } from '../../constants/terms-and-conditions-version.js'

/* global cy  */

let lastReportTitle
let davidIrvingPostTitle = 'The Truth about the Holocaust'
let davidIrvingPostSlug = 'the-truth-about-the-holocaust'
let annoyingUserWhoMutedModeratorTitle = 'Fake news'

const savePostTitle = $post => {
  return $post
    .first()
    .find('.title')
    .first()
    .invoke('text')
    .then(title => {
      lastReportTitle = title
    })
}

Given("I see David Irving's post on the newsfeed", page => {
  cy.openPage('newsfeed')
})

Given('I am logged in with a {string} role', role => {
  cy.factory().build('user', {
    termsAndConditionsAgreedVersion: VERSION,
    role,
    name: `${role} is my name`
  }, {
    email: `${role}@example.org`,
    password: '1234',
  })
  cy.neode()
    .first("User", {
      name: `${role} is my name`,
    })
    .then(user => {
      return new Cypress.Promise((resolve, reject) => {
        return user.toJson().then((user) => resolve(user))
      })
    })
    .then(user => cy.login(user))
})

When('I click on "Report User" from the content menu in the user info box', () => {
  cy.contains('.base-card', davidIrvingPostTitle)
    .get('.user-content-menu .base-button')
    .click({ force: true })

  cy.get('.popover .ds-menu-item-link')
    .contains('Report User')
    .click()
})

When('I report the author', () => {
  cy.get('.page-name-profile-id-slug').then(() => {
    invokeReportOnElement('.base-card').then(() => {
      cy.get('button')
        .contains('Send')
        .click()
    })
  })
})

When('I click on send in the confirmation dialog', () => {
  cy.get('button')
    .contains('Send')
    .click()
})

Then('I get a success message', () => {
  cy.get('.iziToast-message').contains('Thanks')
})

Then('I see my reported user', () => {
  cy.get('table').then(() => {
    cy.get('tbody tr')
      .first()
      .contains(lastReportTitle.trim())
  })
})

When("they have a post someone has reported", () => {
  cy.factory()
    .build("post", {
      title,
    }, {
      authorId: 'annnoying-user',
    });
})
