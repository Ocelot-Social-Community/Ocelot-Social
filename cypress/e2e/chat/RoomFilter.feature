Feature: Chat Room Filter
  As a user
  I want to filter chat rooms by name
  So that I can quickly find a conversation

  Background:
    Given the following "users" are in the database:
      | slug      | email                | password | id       | name          | termsAndConditionsAgreedVersion |
      | alice     | alice@example.org    | 1234     | alice    | Alice         | 0.0.4                          |
      | bob       | bob@example.org      | 1234     | bob      | Bob           | 0.0.4                          |
      | charlie   | charlie@example.org  | 1234     | charlie  | Charlie       | 0.0.4                          |
    And "alice" sends a chat message "Hi Bob" to "bob"
    And "charlie" sends a chat message "Hi Bob" to "bob"

  Scenario: Filter rooms by name
    Given I am logged in as "bob"
    And I navigate to page "/chat"
    Then I see "Charlie" in the room list
    And I see "Alice" in the room list
    When I type "Ali" in the room filter
    Then I see "Alice" in the room list
    And I do not see "Charlie" in the room list

  Scenario: Clear filter restores all rooms
    Given I am logged in as "bob"
    And I navigate to page "/chat"
    When I type "Ali" in the room filter
    Then I see "Alice" in the room list
    When I clear the room filter
    Then I see "Alice" in the room list
    And I see "Charlie" in the room list
