Feature: Chat Search
  As a user
  I want to search for users and groups to start conversations
  So that I can easily find chat partners

  Background:
    Given the following "users" are in the database:
      | slug    | email              | password | id     | name          | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org  | 1234     | alice  | Alice         | 0.0.4                          |
      | bob     | bob@example.org    | 4321     | bob    | Bob           | 0.0.4                          |
    And the following "groups" are in the database:
      | id          | name         | slug         | ownerId | groupType | description                                                                                                       |
      | test-group  | Test Group   | test-group   | alice   | public    | This is a test group for e2e testing of the chat search feature. It needs to be long enough to pass validation.    |

  Scenario: Search for a user and start a chat
    Given I am logged in as "alice"
    And I navigate to page "/chat"
    When I click the add chat button
    And I search for "bob" in the chat search
    Then I see "Bob" in the chat search results
    When I select "Bob" from the chat search results
    Then I see the chat room with "Bob"

  Scenario: Search for a group and start a group chat
    Given "alice" is a member of group "test-group"
    And I am logged in as "alice"
    And I navigate to page "/chat"
    When I click the add chat button
    And I search for "test-group" in the chat search
    Then I see "Test Group" in the chat search results
    When I select "Test Group" from the chat search results
    Then I see the chat room with "Test Group"

  Scenario: Search with less than 3 characters shows no results
    Given I am logged in as "alice"
    And I navigate to page "/chat"
    When I click the add chat button
    And I search for "bo" in the chat search
    Then I see no chat search results
