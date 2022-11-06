import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I mute the user {string}", name => {
  cy.neode()
    .first("User", { name })
    .then(mutedUser => {
      cy.neode()
        .first("User", {
          name: "Peter Pan"
        })
        .relateTo(mutedUser, "muted");
    });
});
