Feature: Chat Avatars
  As a user
  I want to see avatars for all chat participants
  So that I can visually identify who I am chatting with

  Background:
    Given the following "users" are in the database:
      | slug    | email              | password | id     | name          | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org  | 1234     | alice  | Alice         | 0.0.4                          |
      | bob     | bob@example.org    | 1234     | bob    | Bob           | 0.0.4                          |

  Scenario: Room list shows avatar for each room
    Given "alice" sends a chat message "Hello" to "bob"
    And I am logged in as "bob"
    And I navigate to page "/chat"
    Then I see an avatar in the room list

  Scenario: Messages show avatar for other user and own messages
    Given "alice" sends a chat message "Hello" to "bob"
    And I am logged in as "bob"
    And I navigate to page "/chat"
    When I click on the room "Alice"
    Then I see the message "Hello" in the chat
    And I see an avatar for the other user's message
    When I send the message "Hi Alice!" in the chat
    Then I see an avatar for my own message
