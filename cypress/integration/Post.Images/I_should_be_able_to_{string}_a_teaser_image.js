import { Then } from "cypress-cucumber-preprocessor/steps";

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