import { When, Then } from "cypress-cucumber-preprocessor/steps";
import locales from '../../../webapp/locales'
import orderBy from 'lodash/orderBy'

const languages = orderBy(locales, 'name')

Then("I click on the {string} button", text => {
  cy.get("button")
    .contains(text)
    .click();
});

When("I click on 'Pin post'", (string)=> {
  cy.get("a.ds-menu-item-link").contains("Pin post")
    .click()
})

/* Then('confirm crop', () => {
  cy.get('.crop-confirm')
    .click()
}) */