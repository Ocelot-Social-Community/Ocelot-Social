import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I fill in my credentials {string} {string}", (email,password) => {
  cy.get("input[name=email]")
    .trigger("focus")
    .type('{selectall}{backspace}')
    .type(email)
    .get("input[name=password]")
    .trigger("focus")
    .type('{selectall}{backspace}')
    .type(password);
});
