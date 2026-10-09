Feature: Posts in a closed group
  As a member of a closed group
  I want what we post there to stay among us
  So that the group is a place to speak freely

  # The backend specs prove the rule (posts.groupVisibility.spec.ts); this proves the page does not
  # undo it — the feed, and a post opened by its link, which the server renders on its own.

  Background:
    Given the following "users" are in the database:
      | slug     | email                | password | id       | name     | termsAndConditionsAgreedVersion |
      | owner    | owner@example.org    | 1234     | owner    | Olivia   | 0.0.4                           |
      | member   | member@example.org   | 1234     | member   | Martha   | 0.0.4                           |
      | outsider | outsider@example.org | 1234     | outsider | Oscar    | 0.0.4                           |
    And the following "groups" are in the database:
      | id            | name          | slug          | template | ownerId | about       | description                                                       | actionRadius |
      | closed-circle | Closed Circle | closed-circle | closed   | owner   | Among us    | A closed group whose posts are for its members, to see them stay. | regional     |
    And "member" is a member of group "closed-circle"
    And the following "posts" are in the database:
      | id        | title             | slug              | content                    | authorId |
      | p-inside  | Inside the circle | inside-the-circle | Only for the circle.       | owner    |
      | p-outside | Out in the open   | out-in-the-open   | Anybody may read this one. | owner    |
    And the post "p-inside" is in group "closed-circle"

  Scenario: A member sees the group's post in the feed
    Given I am logged in as "member"
    When I navigate to page "/"
    Then I see the post "Inside the circle" in the group feed

  Scenario: An outsider does not see it in the feed
    Given I am logged in as "outsider"
    When I navigate to page "/"
    Then I see the post "Out in the open" in the group feed
    And I do not see the post "Inside the circle" in the feed

  Scenario: An outsider cannot open it by its link
    Given I am logged in as "outsider"
    When I navigate to page "/post/p-inside/inside-the-circle"
    Then the page shows no post "Inside the circle"

  Scenario: A visitor cannot open it by its link
    When I navigate to page "/post/p-inside/inside-the-circle"
    Then the page shows no post "Inside the circle"
