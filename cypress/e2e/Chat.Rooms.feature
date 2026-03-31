Feature: Chat Rooms
  As a user
  I want to manage and navigate between chat rooms
  So that I can keep track of my conversations

  Background:
    Given the following "users" are in the database:
      | slug      | email                | password | id       | name          | termsAndConditionsAgreedVersion |
      | alice     | alice@example.org    | 1234     | alice    | Alice         | 0.0.4                          |
      | bob       | bob@example.org      | 4321     | bob      | Bob           | 0.0.4                          |
      | charlie   | charlie@example.org  | 5678     | charlie  | Charlie       | 0.0.4                          |

  Scenario: Switch between chat rooms
    Given "alice" sends a chat message "Hello Bob!" to "bob"
    And "charlie" sends a chat message "Hi Bob!" to "bob"
    And I am logged in as "bob"
    And I navigate to page "/chat"
    When I click on the room "Alice"
    Then I see the message "Hello Bob!" in the chat
    When I click on the room "Charlie"
    Then I see the message "Hi Bob!" in the chat

  Scenario: Room list is sorted by latest activity
    Given "alice" sends a chat message "First message" to "bob"
    And "charlie" sends a chat message "Second message" to "bob"
    And I am logged in as "bob"
    And I navigate to page "/chat"
    Then I see "Charlie" at position 1 in the room list
    And I see "Alice" at position 2 in the room list
