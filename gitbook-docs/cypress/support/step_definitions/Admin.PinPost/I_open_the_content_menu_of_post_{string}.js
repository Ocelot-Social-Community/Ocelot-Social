import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I open the content menu of post {string}", (title) => {
  cy.contains('.post-teaser', title)
    .find('.content-menu .base-button')
    .click()
})
