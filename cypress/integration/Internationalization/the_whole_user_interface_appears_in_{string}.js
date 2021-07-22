import { Then } from "cypress-cucumber-preprocessor/steps";
import locales from '../../../webapp/locales'

Then("the whole user interface appears in {string}", language => {
  const { code } = locales.find((entry) => entry.name === language);
  cy.get(`html[lang=${code}]`);
  cy.getCookie("locale").should("have.property", "value", code);
});