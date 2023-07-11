import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I should be able to {string} a teaser image", condition => {
  switch(condition){
    case "change":
      cy.get(".delete-image-button")
        .click()
      cy.fixture("humanconnection.png").as("postTeaserImage").then(function() {
        cy.get("#postdropzone").selectFile(
          { contents: this.postTeaserImage, fileName: "humanconnection.png", mimeType: "image/png" },
          { action: "drag-drop" }
        ).wait(750);
      })
      break;
    case "add":
      cy.fixture("onourjourney.png").as("postTeaserImage").then(function() {
        cy.get("#postdropzone").selectFile(
          { contents: this.postTeaserImage, fileName: "onourjourney.png", mimeType: "image/png" },
          { action: "drag-drop" }
        ).wait(750);
      })
      break;
    case "remove":
      cy.get(".delete-image-button")
        .click()
      break;
  }
  
})
