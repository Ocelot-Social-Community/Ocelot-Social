import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I {string} see {string} from the content menu in the user info box", (condition, link) => {
  cy.get(".user-content-menu .base-button").click()
  cy.get(".popover .ds-menu-item-link")
    .should(condition === 'should' ? 'contain' : 'not.contain', link)
})