import { When } from "@badeball/cypress-cucumber-preprocessor";

When("a user has blocked me", () => {
  cy.neode()
    .firstOf("User", {
      name: "Peter Pan"
    })
    .then(blockedUser => {
      cy.neode()
        .firstOf("User", {
          name: 'Harassing User'
        })
        .relateTo(blockedUser, "blocked");
    });
});
