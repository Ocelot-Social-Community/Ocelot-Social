Feature: External Room Creation
  As a user
  I want incoming messages from new users to appear in my room list
  Without losing focus on my current conversation

  Background:
    Given the following "users" are in the database:
      | slug      | email                | password | id       | name          | termsAndConditionsAgreedVersion |
      | alice     | alice@example.org    | 1234     | alice    | Alice         | 0.0.4                          |
      | bob       | bob@example.org      | 1234     | bob      | Bob           | 0.0.4                          |
      | charlie   | charlie@example.org  | 1234     | charlie  | Charlie       | 0.0.4                          |

  Scenario: New room from external message does not steal focus
    Given "alice" sends a chat message "Hi Bob!" to "bob"
    And I am logged in as "bob"
    And I navigate to page "/chat"
    And I click on the room "Alice"
    And I see the message "Hi Bob!" in the chat
    When "charlie" sends a chat message "Surprise!" to "bob"
    Then I see "Charlie" in the room list
    And I see the message "Hi Bob!" in the chat

  Scenario: New room from external message shows unread badge
    Given "alice" sends a chat message "Hi Bob!" to "bob"
    And I am logged in as "bob"
    And I navigate to page "/chat"
    And I click on the room "Alice"
    When "charlie" sends a chat message "Surprise!" to "bob"
    Then I see 1 unread chat message in the header
