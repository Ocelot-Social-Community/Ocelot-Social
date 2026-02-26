Feature: Chat notification badge
  As a user
  I want to see a notification badge on the chat icon
  When another user sends me a chat message

  Background:
    Given the following "users" are in the database:
      | slug    | email              | password | id     | name          | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org  | 1234     | alice  | Alice         | 0.0.4                          |
      | bob     | bob@example.org    | 4321     | bob    | Bob           | 0.0.4                          |

  Scenario: Receive chat notification live via websocket
    Given I am logged in as "bob"
    And I navigate to page "/"
    And I see no unread chat messages in the header
    When "alice" sends a chat message "Hello Bob!" to "bob"
    Then I see 1 unread chat message in the header
