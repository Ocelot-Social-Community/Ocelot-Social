Feature: File Messages
  As a user
  I want to send files and audio messages in chat
  So that I can share media with other users

  Background:
    Given the following "users" are in the database:
      | slug    | email              | password | id     | name          | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org  | 1234     | alice  | Alice         | 0.0.4                          |
      | bob     | bob@example.org    | 1234     | bob    | Bob           | 0.0.4                          |

  Scenario: File message shows filename in room preview
    Given I am logged in as "alice"
    And I navigate to page "/chat?userId=bob"
    When I upload the file "humanconnection.png" in the chat
    Then I see the room preview contains "humanconnection"

