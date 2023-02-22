import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I see a toaster with status {string}", (status) => {
  switch (status) {
    case "success":
      cy.get(".iziToast.iziToast-color-green").should("be.visible");
      break;
  }
})