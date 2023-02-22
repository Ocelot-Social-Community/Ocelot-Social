import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I see a toaster with status {string}", (status) => {
  switch (status) {
    case "success":
      cy.get(".iziToast.iziToast-color-green").should("be.visible");
      break;
  }
})
