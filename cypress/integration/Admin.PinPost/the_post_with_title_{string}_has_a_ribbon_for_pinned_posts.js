import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the post with title {string} has a ribbon for pinned posts", (title) => {
  cy.get(".post-teaser").contains(title)
    .parent()
    .parent()
    .find(".ribbon.--pinned")
    .should("contain", "Announcement")
})