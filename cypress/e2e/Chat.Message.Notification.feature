Feature: Notifications for Chat Messages via E-Mail
  Absent or offline users
  Get notified about chat messages via e-mail
  To be informed promptly about recent activities in their chats

  Online users just get the chat room list and chat notification list.
  For chat messages from muted users no emails are send.

  Background:
    Given the following "users" are in the database:
      | name               | slug               | email                 | password | id   |  termsAndConditionsAgreedVersion |
      | Bob der Baumeister | bob-der-baumeister | moderator@example.org | 1234     | u2   |  0.0.4                           |
      | Jenny Rostock      | jenny-rostock      | user@example.org      | 1234     | u3   |  0.0.4                           |
      | Nathan Narrator    | nathan-narrator    | narrator@example.org  | abcd     | u_nn |  0.0.4                           |

  Scenario: No Chat Notification Email when Online
    Given I am logged in as "bob-der-baumeister"
    When "jenny-rostock" sends a chat message to "bob-der-baumeister"
    And "nathan-narrator" sends a chat message to "bob-der-baumeister"
    Then "Bob der Baumeister" should receive "one" chat notification email (referencing "Jenny Rostock")
    But "Bob der Baumeister" should receive "no" chat notification email (referencing "nathan-narrator")
  