import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I should be able to change my profile picture", () => {
  const avatarUpload = "onourjourney.png";
  
  cy.fixture(avatarUpload, "base64").then(fileContent => {
    cy.get("#customdropzone").selectFile(
      { fileName: avatarUpload, mimeType: "image/png" },
      { action: 'drag-drop' }
    );
  });
  cy.get(".profile-page-avatar img")
    .should("have.attr", "src")
    .and("contains", "onourjourney");
  cy.contains(".iziToast-message", "Upload successful")
    .should("have.length",1);
});
