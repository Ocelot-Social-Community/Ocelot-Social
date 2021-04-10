import { When } from "cypress-cucumber-preprocessor/steps";
import loginCredentials from '../data/loginCredentials'

When("I fill in my credentials", () => {
  cy.get("input[name=email]")
    .trigger("focus")
    .type(loginCredentials.email)
    .get("input[name=password]")
    .trigger("focus")
    .type(loginCredentials.password);
});