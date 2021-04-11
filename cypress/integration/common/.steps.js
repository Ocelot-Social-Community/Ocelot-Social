import {
  Given,
  When,
  Then
} from "cypress-cucumber-preprocessor/steps";
import helpers from "../../support/helpers";
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

Given("I log in as {string}", name => {
  cy.logout()
  cy.neode()
    .first("User", {
      name
    })
    .then(user => {
      return new Cypress.Promise((resolve, reject) => {
        return user.toJson().then((user) => resolve(user))
      })
    })
    .then(user => cy.login(user))
})

Given("the {string} user searches for {string}", (_, postTitle) => {
  cy.logout()
  cy.neode()
    .first("User", {
      id: "annoying-user"
    })
    .then(user => {
      return new Cypress.Promise((resolve, reject) => {
        return user.toJson().then((user) => resolve(user))
      })
    })
    .then(user => cy.login(user))
  cy.get(".searchable-input .ds-select input")
    .focus()
    .type(postTitle);
});

Given("we have a selection of categories", () => {
  cy.factory().build('category', { id: "cat0", slug: "just-for-fun" });
});

Given("we have a selection of tags and categories as well as posts", () => {
  cy.factory()
    .build('category', { id: 'cat12', name: "Just For Fun", icon: "smile", })
    .build('category', { id: 'cat121', name: "Happiness & Values", icon: "heart-o"})
    .build('category', { id: 'cat122', name: "Health & Wellbeing", icon: "medkit"})
    .build("tag", { id: "Ecology" })
    .build("tag", { id: "Nature" })
    .build("tag", { id: "Democracy" })
    .build("user", { id: 'a1' })
    .build("post", {}, {
      authorId: 'a1',
      tagIds: ["Ecology", "Nature", "Democracy"],
      categoryIds: ["cat12"]
    })
    .build("post", {}, {
      authorId: 'a1',
      tagIds: ["Nature", "Democracy"],
      categoryIds: ["cat121"]
    })
    .build("user", { id: 'a2' })
    .build("post", {}, {
      authorId: 'a2',
      tagIds: ['Nature', 'Democracy'],
      categoryIds: ["cat12"]
    })
    .build("post", {}, {
      tagIds: ['Democracy'],
      categoryIds: ["cat122"]
    })
});

Given("my user account has the role {string}", role => {
  cy.factory().build("user", {
    role,
    ...termsAndConditionsAgreedVersion,
  }, /*loginCredentials*/ 'TODO');
});

When("I log out", cy.logout);

When("I visit {string}", page => {
  cy.openPage(page);
});

When("a blocked user visits the post page of one of my authored posts", () => {
  cy.logout()
  cy.neode()
    .first("User", {
      name: 'Harassing User'
    })
    .then(user => {
      return new Cypress.Promise((resolve, reject) => {
        return user.toJson().then((user) => resolve(user))
      })
    })
    .then(user => cy.login(user))
  cy.openPage('post/previously-created-post')
})

Given("I am on the {string} page", page => {
  cy.openPage(page);
});

When("I select {string} in the language menu", name => {
  cy.switchLanguage(name, true);
});

Given("I previously switched the language to {string}", name => {
  cy.switchLanguage(name, true);
});

Then("the whole user interface appears in {string}", name => {
  const {
    code
  } = helpers.getLangByName(name);
  cy.get(`html[lang=${code}]`);
  cy.getCookie("locale").should("have.property", "value", code);
});

Then("I see a button with the label {string}", label => {
  cy.contains("button", label);
});

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

Then(/^I should see only ([0-9]+) posts? on the landing page/, postCount => {
  cy.get(".post-teaser").should("have.length", postCount);
});

Then("the first post on the landing page has the title:", title => {
  cy.get(".post-teaser:first").should("contain", title);
});

Then(
  "the page {string} returns a 404 error with a message:",
  (route, message) => {
    cy.request({
        url: route,
        failOnStatusCode: false
      })
      .its("status")
      .should("eq", 404);
    cy.visit(route, {
      failOnStatusCode: false
    });
    cy.get(".error-message").should("contain", message);
  }
);

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

When("I visit the profile page of the annoying user", name => {
  cy.openPage("profile/annoying-user");
});

When("I ", name => {
  cy.openPage("profile/annoying-user");
});

When(
  "I click on {string} from the content menu in the user info box",
  button => {
    cy.get(".user-content-menu .base-button").click();
    cy.get(".popover .ds-menu-item-link")
      .contains(button)
      .click({
        force: true
      });
  }
);

When("I navigate to my {string} settings page", settingsPage => {
  cy.get(".avatar-menu-trigger").click();
  cy.get(".avatar-menu-popover")
    .find("a[href]")
    .contains("Settings")
    .click();
  cy.contains(".ds-menu-item-link", settingsPage).click();
});

Given("I follow the user {string}", name => {
  cy.neode()
    .first("User", {
      name
    })
    .then(followed => {
      cy.neode()
        .first("User", {
          name: narratorParams.name
        })
        .relateTo(followed, "following");
    });
});

Given('{string} wrote a post {string}', (_, title) => {
  cy.factory()
    .build("post", {
      title,
    }, {
      authorId: 'annoying-user',
    });
});

Then("the list of posts of this user is empty", () => {
  cy.get(".base-card").not(".post-link");
  cy.get(".main-container").find(".ds-space.hc-empty");
});

Then("I get removed from his follower collection", () => {
  cy.get(".base-card").not(".post-link");
  cy.get(".main-container").contains(
    ".base-card",
    "is not followed by anyone"
  );
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

When("I block the user {string}", name => {
  cy.neode()
    .first("User", {
      name
    })
    .then(blockedUser => {
      cy.neode()
        .first("User", {
          id: narratorParams.id
        })
        .relateTo(blockedUser, "blocked");
    });
});

When("a user has blocked me", () => {
  cy.neode()
    .first("User", {
      name: narratorParams.name
    })
    .then(blockedUser => {
      cy.neode()
        .first("User", {
          name: 'Harassing User'
        })
        .relateTo(blockedUser, "blocked");
    });
});

Then("I see only one post with the title {string}", title => {
  cy.get(".main-container")
    .find(".post-link")
    .should("have.length", 1);
  cy.get(".main-container").contains(".post-link", title);
});

Then("they should not see the comment form", () => {
  cy.get(".base-card").children().should('not.have.class', 'comment-form')
})

Then("they should see a text explaining why commenting is not possible", () => {
  cy.get('.ds-placeholder').should('contain', "Commenting is not possible at this time on this post.")
})

Then("I should see no users in my blocked users list", () => {
  cy.get('.ds-placeholder')
    .should('contain', "So far, you have not blocked anybody.")
})

Then("I {string} see {string} from the content menu in the user info box", (condition, link) => {
  cy.get(".user-content-menu .base-button").click()
  cy.get(".popover .ds-menu-item-link")
    .should(condition === 'should' ? 'contain' : 'not.contain', link)
})

Then('I should not see {string} button', button => {
  cy.get('.base-card .action-buttons')
    .should('have.length', 1)
})

Then('I should see the {string} button', button => {
  cy.get('.base-card .action-buttons .base-button')
    .should('contain', button)
})
