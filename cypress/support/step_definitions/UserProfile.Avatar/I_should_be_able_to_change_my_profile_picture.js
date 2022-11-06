import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I should be able to change my profile picture", () => {
  const avatarUpload = "onourjourney.png";
  
  cy.fixture(avatarUpload, "base64").then(fileContent => {
    cy.get("#customdropzone").upload(
      { fileContent, fileName: avatarUpload, mimeType: "image/png" },
      { subjectType: "drag-n-drop", force: true }
    );
  });
  cy.get(".profile-page-avatar img")
    .should("have.attr", "src")
    .and("contains", "onourjourney");
  cy.contains(".iziToast-message", "Upload successful")
    .should("have.length",1);
});
