Feature: Chat Read Status
  As a user
  I want messages to be marked as read when I view them
  So that I know which messages are new

  Background:
    Given the following "users" are in the database:
      | slug      | email                | password | id       | name          | termsAndConditionsAgreedVersion |
      | alice     | alice@example.org    | 1234     | alice    | Alice         | 0.0.4                          |
      | bob       | bob@example.org      | 1234     | bob      | Bob           | 0.0.4                          |
      | charlie   | charlie@example.org  | 1234     | charlie  | Charlie       | 0.0.4                          |

  Scenario: Messages are marked as read when opening a chat room
    Given "alice" sends a chat message "Hey Bob!" to "bob"
    And I am logged in as "bob"
    And I navigate to page "/"
    And I see 1 unread chat message in the header
    When I navigate to page "/chat"
    And I click on the room "Alice"
    Then I see the message "Hey Bob!" in the chat
    And I see no unread chat messages in the header

  Scenario: Notification badge decreases when reading one of multiple rooms
    Given "alice" sends a chat message "Hey Bob!" to "bob"
    And "charlie" sends a chat message "Hi Bob!" to "bob"
    And I am logged in as "bob"
    And I navigate to page "/"
    And I see 2 unread chat message in the header
    When I navigate to page "/chat"
    And I click on the room "Alice"
    Then I see 1 unread chat message in the header
