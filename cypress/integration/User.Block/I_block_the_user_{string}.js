import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I block the user {string}", name => {
  cy.neode()
    .first("User", { name })
    .then(blockedUser => {
      cy.neode()
        .first("User", {id: "id-of-peter-pan"})
        .relateTo(blockedUser, "blocked");
    });
});
