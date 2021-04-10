import { When, Then } from "cypress-cucumber-preprocessor/steps";
import locales from '../../../webapp/locales'
import orderBy from 'lodash/orderBy'

const languages = orderBy(locales, 'name')

Then("I click on the {string} button", text => {
  cy.get("button")
    .contains(text)
    .click();
});

When("I open the content menu of post {string}", (title)=> {
  cy.contains('.post-teaser', title)
  .find('.content-menu .base-button')
  .click()
})

When("I click on 'Pin post'", (string)=> {
  cy.get("a.ds-menu-item-link").contains("Pin post")
    .click()
})

Then("there is no button to pin a post", () => {
  cy.get("a.ds-menu-item-link")
    .should('contain', "Report Post") // sanity check
    .should('not.contain', "Pin post")
})

And("the post with title {string} has a ribbon for pinned posts", (title) => {
  cy.get(".post-teaser").contains(title)
  .parent()
  .parent()
  .find(".ribbon.--pinned")
  .should("contain", "Announcement")
})

Then("I see a toaster with {string}", (title) => {
  cy.get(".iziToast-message").should("contain", title);
})

Then("I should be able to {string} a teaser image", condition => {
  cy.reload()
  const teaserImageUpload = (condition === 'change') ? "humanconnection.png" : "onourjourney.png";
  cy.fixture(teaserImageUpload).as('postTeaserImage').then(function() {
    cy.get("#postdropzone").upload(
      { fileContent: this.postTeaserImage, fileName: teaserImageUpload, mimeType: "image/png" },
      { subjectType: "drag-n-drop", force: true }
    );
  })
})

Then('confirm crop', () => {
  cy.get('.crop-confirm')
    .click()
})

Then("I add all required fields", () => {
  cy.get('input[name="title"]')
    .type('new post')
    .get(".editor .ProseMirror")
    .type('new post content')
    .get(".categories-select .base-button")
    .first()
    .click()
    .get('.base-card > .select-field input')
    .click()
    .get('.ds-select-option')
    .eq(languages.findIndex(l => l.code === 'en'))
    .click()
})

Then("the post was saved successfully with the {string} teaser image", condition => {
  cy.get(".base-card > .title")
    .should("contain", condition === 'updated' ? 'to be updated' : 'new post')
    .get(".content")
    .should("contain", condition === 'updated' ? 'successfully updated' : 'new post content')
    .get('.post-page img')
    .should("have.attr", "src")
    .and("contains", condition === 'updated' ? 'humanconnection' : 'onourjourney')
})

Then("the first image should not be displayed anymore", () => {
  cy.get(".hero-image")
    .children()
    .get('.hero-image > .image')
    .should('have.length', 1)
    .and('have.attr', 'src')
})

Then('the {string} post was saved successfully without a teaser image', condition => {
  cy.get(".base-card > .title")
    .should("contain", condition === 'updated' ? 'to be updated' : 'new post')
    .get(".content")
    .should("contain", condition === 'updated' ? 'successfully updated' : 'new post content')
    .get('.post-page')
    .should('exist')
    .get('.hero-image > .image')
    .should('not.exist')
})

Then('I should be able to remove it', () => {
  cy.get('.crop-cancel')
    .click()
})

When('my post has a teaser image', () => {
  cy.get('.contribution-form .image')
    .should('exist')
    .and('have.attr', 'src')
})

Then('I should be able to remove the image', () => {
  cy.get('.dz-message > .base-button')
    .click()
})
