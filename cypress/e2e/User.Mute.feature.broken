Feature: Mute a User
  As a user
  I'd like to have a button to mute another user
  To prevent him from seeing and interacting with my contributions
  
  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name           | slug           | termsAndConditionsAgreedVersion |
      | peterpan@example.org | 123      | id-of-peter-pan | Peter Pan      | peter-pan      | 0.0.4                           |
      | user@example.org     | 123      | annoying-user   | Annoying User  | annoying-user  | 0.0.4                           |
    Given the following "posts" are in the database:
      | id           | title                    | content                 | authorId        |
      | im-not-muted | Post that should be seen | cause I'm not muted     | id-of-peter-pan |
      | bWBjpkTKZp   | previously created post  | previously-created-post | id-of-peter-pan |
    And I am logged in as "peter-pan"

  Scenario: Mute a user
    Given I navigate to page "/profile/annoying-user"
    When I click on "Mute user" from the content menu in the user info box
    And I navigate to my "Muted users" settings page
    Then I can see the following table:
      | Avatar | Name           |
      |        | Annoying User  |

  Scenario: Mute a previously followed user
    Given I follow the user "Annoying User"
    And "annoying-user" wrote a post "Spam Spam Spam"
    When I navigate to page "/profile/annoying-user"
    And I click on "Mute user" from the content menu in the user info box
    Then the list of posts of this user is empty
    And I get removed from his follower collection

  Scenario: Posts of muted users are filtered from search results, users are not
    Given "annoying-user" wrote a post "Spam Spam Spam"
    When I search for "Spam"
    And I wait for 3000 milliseconds
    Then I should see the following posts in the select dropdown:
      | title          |
      | Spam Spam Spam |
    When I mute the user "Annoying User"
    And I refresh the page
    And I search for "Anno"
    And I wait for 3000 milliseconds
    Then the search should not contain posts by the annoying user
    But the search should contain the annoying user
    But I search for "not muted"
    And I wait for 3000 milliseconds
    Then I should see the following posts in the select dropdown:
      | title                    |
      | Post that should be seen |
  
  Scenario: Muted users can still see my posts
    And I mute the user "Annoying User"
    And I am logged in as "annoying-user"
    And I navigate to page "/"
    And I search for "previously created"
    And I wait for 3000 milliseconds
    Then I should see the following posts in the select dropdown:
      | title                   |
      | previously created post |
