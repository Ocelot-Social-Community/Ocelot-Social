import { Given } from "@badeball/cypress-cucumber-preprocessor";

Given("I follow the user {string}", name => {
  cy.neode()
    .first("User", {name})
    .then(followed => {
      cy.neode()
        .first("User", {
          name: "Peter Pan"
        })
        .relateTo(followed, "following");
    });
});
