import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I block the user {string}", name => {
  cy.neode()
    .firstOf("User", { name })
    .then(blockedUser => {
      cy.neode()
        .firstOf("User", {id: "id-of-peter-pan"})
        .relateTo(blockedUser, "blocked");
    });
});
