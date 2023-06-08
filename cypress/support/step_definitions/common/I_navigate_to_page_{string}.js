import { Given } from "@badeball/cypress-cucumber-preprocessor";
import 'cypress-network-idle';

Given("I navigate to page {string}", page => {
  cy.visit(page);
  cy.waitForNetworkIdle(2000)
});
