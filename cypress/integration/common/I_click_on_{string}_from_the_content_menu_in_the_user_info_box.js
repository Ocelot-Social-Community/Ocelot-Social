import { When } from "cypress-cucumber-preprocessor/steps";

When("I click on {string} from the content menu in the user info box",
  button => {
    cy.get(".user-content-menu .base-button").click();
    cy.get(".popover .ds-menu-item-link")
      .contains(button)
      .click({
        force: true
      });
    }
);