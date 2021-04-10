import { Then } from "cypress-cucumber-preprocessor/steps";

Then('I should be able to remove the image', () => {
  cy.get('.delete-image-button' /* .dz-message > .base-button .crop-cancel*/)
    .click()
})