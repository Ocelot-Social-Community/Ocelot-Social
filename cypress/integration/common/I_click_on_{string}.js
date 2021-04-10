import { When } from "cypress-cucumber-preprocessor/steps";

When("I click on {string}", element => {
  const elementSelectors = {
    'submit button': 'button[name=submit]',
    'create post button': '.post-add-button',
    'save button': 'button[type=submit]',
    'the first post': '.post-teaser:nth-child(1)',
  }

  cy.get(elementSelectors[element])
    .click()
    .wait(750);
});