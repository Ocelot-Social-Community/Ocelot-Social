import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I mute the user {string}", name => {
  cy.neode()
    .firstOf("User", { name })
    .then(mutedUser => {
      cy.neode()
        .firstOf("User", {
          name: "Peter Pan"
        })
        .relateTo(mutedUser, "muted");
    });
});
