import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I wait for {int} milliseconds", time => {
  cy.wait(time)
});
