import { When } from "@badeball/cypress-cucumber-preprocessor";

When("open the notification menu and click on the first item", () => {
  cy.get(".notifications-menu")
    .invoke('show')
    .click(); // "invoke('show')" because of the delay for show the menu
  cy.get(".notification .link")
    .first()
    .click({force: true});
});  
