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

/* Then('confirm crop', () => {
  cy.get('.crop-confirm')
    .click()
}) */


/*Then('I should be able to remove the image', () => {
  cy.get('.dz-message > .base-button')
    .click()
})*/
