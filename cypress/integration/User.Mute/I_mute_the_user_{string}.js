import { When } from "cypress-cucumber-preprocessor/steps";

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