Feature: Direct Messages
  As a user
  I want to send direct messages to other users
  So that I can have private conversations

  Background:
    Given the following "users" are in the database:
      | slug    | email              | password | id     | name          | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org  | 1234     | alice  | Alice         | 0.0.4                          |
      | bob     | bob@example.org    | 1234     | bob    | Bob           | 0.0.4                          |

  Scenario: Send a direct message via chat page
    Given I am logged in as "alice"
    And I navigate to page "/chat"
    When I open a direct message with "bob"
    And I send the message "Hello Bob!" in the chat
    Then I see the message "Hello Bob!" in the chat

  Scenario: Open a direct message via query parameter
    Given I am logged in as "alice"
    When I navigate to page "/chat?userId=bob"
    Then I see the chat room with "Bob"
    When I send the message "Hi from link!" in the chat
    Then I see the message "Hi from link!" in the chat
