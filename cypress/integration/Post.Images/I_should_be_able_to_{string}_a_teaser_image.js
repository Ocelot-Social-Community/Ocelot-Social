import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I should be able to {string} a teaser image", condition => {
  // cy.reload()
  switch(condition){
    case 'change':
      cy.get('.delete-image-button')
        .click()
      cy.fixture('humanconnection.png').as('postTeaserImage').then(function() {
        cy.get("#postdropzone").upload(
          { fileContent: this.postTeaserImage, fileName: 'humanconnection.png', mimeType: "image/png" },
          { subjectType: "drag-n-drop", force: true }
        ).wait(750);
      })
      break;
    case 'add':
      cy.fixture('onourjourney.png').as('postTeaserImage').then(function() {
        cy.get("#postdropzone").upload(
          { fileContent: this.postTeaserImage, fileName: 'onourjourney.png', mimeType: "image/png" },
          { subjectType: "drag-n-drop", force: true }
        ).wait(750);
      })
      break;
    case 'remove':
      cy.get('.delete-image-button')
        .click()
      break;
  }
  
})