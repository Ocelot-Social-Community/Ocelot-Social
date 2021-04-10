import { When } from "cypress-cucumber-preprocessor/steps";

When("I wait for {int} milliseconds", ms => {
  cy.wait(ms)
});