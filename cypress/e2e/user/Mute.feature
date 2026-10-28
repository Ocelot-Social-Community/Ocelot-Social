Feature: Mute a user
  As a user
  I'd like to have a button to mute another user
  To no longer see their contributions

  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name          | slug          | termsAndConditionsAgreedVersion |
      | peterpan@example.org | 123      | id-of-peter-pan | Peter Pan     | peter-pan     | 0.0.4                           |
      | user@example.org     | 123      | annoying-user   | Annoying User | annoying-user | 0.0.4                           |
    And the following "posts" are in the database:
      | id           | title                    | content                 | authorId        |
      | im-not-muted | Post that should be seen | cause I'm not muted     | id-of-peter-pan |
      | bWBjpkTKZp   | previously created post  | previously-created-post | id-of-peter-pan |
    And I am logged in as "peter-pan"

  Scenario: Mute a user
    When I navigate to page "/profile/annoying-user"
    And I click on "Mute user" from the content menu in the user info box
    Then I should see the "Unmute user" button
    When I navigate to my "Muted users" settings page
    Then I can see the following table:
      |  | Name          | Slug           |
      |  | Annoying User | annoying-user  |

  Scenario: Muting ends my following and hides their posts
    Given "peter-pan" follows "annoying-user"
    And "annoying-user" writes the post "Spam Spam Spam"
    When I navigate to page "/profile/annoying-user"
    And I click on "Mute user" from the content menu in the user info box
    Then the list of posts of this user is empty
    And I get removed from his follower collection

  Scenario: Posts of muted users are filtered from search results, users are not
    Given "annoying-user" writes the post "Spam Spam Spam"
    And I navigate to page "/"
    When I search for "Spam"
    Then I should see the following posts in the select dropdown:
      | title          |
      | Spam Spam Spam |
    When "peter-pan" mutes "annoying-user"
    And I refresh the page
    And I search for "Annoying"
    Then I should see the following users in the select dropdown:
      | name          |
      | Annoying User |
    And I should not see "Spam Spam Spam" in the select dropdown
    When I clear the search field
    And I search for "Spam"
    Then I should not see "Spam Spam Spam" in the select dropdown
    When I clear the search field
    And I search for "not muted"
    Then I should see the following posts in the select dropdown:
      | title                    |
      | Post that should be seen |

  Scenario: Muted users can still find my posts
    Given "peter-pan" mutes "annoying-user"
    And I am logged in as "annoying-user"
    When I navigate to page "/"
    And I search for "previously created"
    Then I should see the following posts in the select dropdown:
      | title                   |
      | previously created post |
