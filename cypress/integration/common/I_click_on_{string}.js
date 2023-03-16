import { When } from "cypress-cucumber-preprocessor/steps";

When("I click on {string}", element => {
  const elementSelectors = {
    'submit button': 'button[name=submit]',
    'create post button': '.post-add-button',
    'save button': 'button[type=submit]',
    'the first post': '.post-teaser:first-child',
    'comment button': 'button[type=submit]',
    'reply button': '.reply-button',
    'security menu': 'a[href="/settings/security"]',
    'pin post': '.ds-menu-item:first-child',
    'Moderation': 'a[href="/moderation"]',
  }

  cy.get(elementSelectors[element])
    .click({force: true})
    .wait(750);
});