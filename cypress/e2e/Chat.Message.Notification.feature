Feature: Notifications for Chat Messages via E-Mail
  Absent or offline users
  Get notified about chat messages via e-mail
  To be informed promptly about recent activities in their chats

  For chat messages from muted or blocked users no emails are send.
  # Online users just get the chat room list and chat notification list.
  Online users do not receive any chat related emails.
  For chat messages from muted users no emails are send.

  Background:
    Given the following "users" are in the database:
      | name               | slug               | email                 | password | id   |  termsAndConditionsAgreedVersion |
      | Bob der Baumeister | bob-der-baumeister | moderator@example.org | 1234     | u2   |  0.0.4                           |
      | Jenny Rostock      | jenny-rostock      | user@example.org      | 1234     | u3   |  0.0.4                           |
      | Nathan Narrator    | nathan-narrator    | narrator@example.org  | abcd     | u_nn |  0.0.4                           |
      | Billy Block        | billy-block        | billy@example.org     | 4321     | u_bb |  0.0.4                           |
    And "Bob der Baumeister" mutes "Nathan Narrator"
    And "Bob der Baumeister" blocks "Billy Block"

  Scenario: Receive Chat Notification Email only when Online
    When "Jenny Rostock" sends a chat message to "Bob der Baumeister"
    And "Nathan Narrator" sends a chat message to "Bob der Baumeister"
    And "Billy Block" sends a chat message to "Bob der Baumeister"
    Then "moderator@example.org" should receive "0" chat notification email referencing "Jenny Rostock"
    When I am logged in as "bob-der-baumeister"
    And "Jenny Rostock" sends a chat message to "Bob der Baumeister"
    And "Nathan Narrator" sends a chat message to "Bob der Baumeister"
    And "Billy Block" sends a chat message to "Bob der Baumeister"
    Then "moderator@example.org" should receive no chat notification email
  