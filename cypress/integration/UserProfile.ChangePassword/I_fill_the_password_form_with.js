import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I fill the password form with:", table => {
  table = table.rowsHash();
  cy.get("input[id=oldPassword]")
    .type(table["Your old password"])
    .get("input[id=password]")
    .type(table["Your new password"])
    .get("input[id=passwordConfirmation]")
    .type(table["Confirm new password"]);
});
