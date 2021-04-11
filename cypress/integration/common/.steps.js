import {
  Given,
  When,
  Then
} from "cypress-cucumber-preprocessor/steps";
import locales from '../../../webapp/locales'
import orderBy from 'lodash/orderBy'

/* global cy  */

const languages = orderBy(locales, 'name')
let lastPost = {};

const annoyingParams = {
  email: "spammy-spammer@example.org",
  slug: 'spammy-spammer',
  password: "1234",
};

When("I log out", cy.logout);

When(`I click on the menu item {string}`, linkOrButton => {
  cy.contains(".ds-menu-item", linkOrButton).click();
});

When("I press {string}", label => {
  cy.contains(label).click();
});

Given("we have the following posts in our database:", table => {
  table.hashes().forEach((attributesOrOptions, i) => {
    cy.factory().build("post", {
      ...attributesOrOptions,
      deleted: Boolean(attributesOrOptions.deleted),
      disabled: Boolean(attributesOrOptions.disabled),
      pinned: Boolean(attributesOrOptions.pinned),
    }, {
      ...attributesOrOptions,
    });
  })
})

When("I click on the avatar menu in the top right corner", () => {
  cy.get(".avatar-menu").click();
});

Given("there is an annoying user called {string}", name => {
  cy.factory().build("user", {
    id: "annoying-user",
    name,
    ...termsAndConditionsAgreedVersion,
  }, annoyingParams);
});

Given("there is an annoying user who has muted me", () => {
  cy.neode()
    .first("User", {
      role: 'moderator'
    })
    .then(mutedUser => {
      cy.neode()
        .first("User", {
          id: 'annoying-user'
        })
        .relateTo(mutedUser, "muted");
    });
});

Given("I am on the profile page of the annoying user", name => {
  cy.openPage("profile/annoying-user/spammy-spammer");
});

When("I ", name => {
  cy.openPage("profile/annoying-user");
});

Then("the list of posts of this user is empty", () => {
  cy.get(".base-card").not(".post-link");
  cy.get(".main-container").find(".ds-space.hc-empty");
});

Given("I wrote a post {string}", title => {
  cy.factory()
    .build("post", {
      title,
    }, {
      authorId: narratorParams.id,
    });
});

When("I mute the user {string}", name => {
  cy.neode()
    .first("User", {
      name
    })
    .then(mutedUser => {
      cy.neode()
        .first("User", {
          name: narratorParams.name
        })
        .relateTo(mutedUser, "muted");
    });
});

Then("I see only one post with the title {string}", title => {
  cy.get(".main-container")
    .find(".post-link")
    .should("have.length", 1);
  cy.get(".main-container").contains(".post-link", title);
});