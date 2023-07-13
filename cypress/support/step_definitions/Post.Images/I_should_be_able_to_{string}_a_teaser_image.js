import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I should be able to {string} a teaser image", condition => {
  let postTeaserImage = ""

  switch(condition){
    case "change":
      postTeaserImage = "humanconnection.png"
      cy.get(".delete-image-button")
        .click()
      cy.get("#postdropzone").selectFile(
        { contents: `cypress/fixtures/${postTeaserImage}`, fileName: postTeaserImage, mimeType: "image/png" },
        { action: "drag-drop", force: true }
      ).wait(750);
      break;
    case "add":
      postTeaserImage = "onourjourney.png"
      cy.get("#postdropzone").selectFile(
        { contents: `cypress/fixtures/${postTeaserImage}`, fileName: postTeaserImage, mimeType: "image/png" },
        { action: "drag-drop", force: true }
      ).wait(750);
      break;
    case "remove":
      cy.get(".delete-image-button")
        .click()
      break;
  }
  
})
