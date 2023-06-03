import { Given } from "@badeball/cypress-cucumber-preprocessor";

Given("there is an annoying user who has muted me", () => {
  cy.neode()
    .firstOf("User", {
      role: 'moderator'
    })
    .then(mutedUser => {
      cy.neode()
        .firstOf("User", {
          id: 'user'
        })
      .relateTo(mutedUser, "muted");
    });
});
