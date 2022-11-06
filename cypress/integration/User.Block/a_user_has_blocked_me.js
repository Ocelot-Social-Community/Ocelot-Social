import { When } from "@badeball/cypress-cucumber-preprocessor";

When("a user has blocked me", () => {
  cy.neode()
    .first("User", {
      name: "Peter Pan"
    })
    .then(blockedUser => {
      cy.neode()
        .first("User", {
          name: 'Harassing User'
        })
        .relateTo(blockedUser, "blocked");
    });
});
