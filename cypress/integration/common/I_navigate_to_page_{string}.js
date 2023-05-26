import { Given } from "cypress-cucumber-preprocessor/steps";
import 'cypress-network-idle';


Given("I navigate to page {string}", page => {
  cy.visit(page);
  cy.waitForNetworkIdle(2000)
});