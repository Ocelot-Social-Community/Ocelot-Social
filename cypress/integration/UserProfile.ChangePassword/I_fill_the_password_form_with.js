import { When } from "cypress-cucumber-preprocessor/steps";

When("I fill the password form with:", table => {
  table = table.rowsHash();
  cy.get("input[id=oldPassword]")
    .type(table["Your old password"])
    .get("input[id=password]")
    .type(table["Your new password"])
    .get("input[id=passwordConfirmation]")
    .type(table["Confirm new password"]);
});