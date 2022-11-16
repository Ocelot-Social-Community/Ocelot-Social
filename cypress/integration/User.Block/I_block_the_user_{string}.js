import { When } from "cypress-cucumber-preprocessor/steps";

When("I block the user {string}", name => {
  cy.neode()
    .first("User", { name })
    .then(blockedUser => {
      cy.neode()
        .first("User", {id: "id-of-peter-pan"})
        .relateTo(blockedUser, "blocked");
    });
});