Feature: Chat notification badge
  As a user
  I want to see a notification badge on the chat icon
  When another user sends me a chat message

  Background:
    Given the following "users" are in the database:
      | slug    | email              | password | id     | name          | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org  | 1234     | alice  | Alice         | 0.0.4                          |
      | bob     | bob@example.org    | 4321     | bob    | Bob           | 0.0.4                          |

  Scenario: Receive chat message and see unread badge via websocket
    Given "alice" sends a chat message "Hello Bob!" to "bob"
    And I am logged in as "bob"
    When I navigate to page "/"
    Then I see 1 unread chat message in the header
