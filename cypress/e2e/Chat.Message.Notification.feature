Feature: Notifications for Chat Messages via E-Mail
  Absent or offline users
  Get notified about chat messages via e-mail
  To be informed promptly about recent activities in their chats

  For chat messages from muted or blocked users no emails are send.
  Online users do not receive any chat related emails.
  For chat messages from muted users no emails are send.

  Background:
    Given the following "users" are in the database:
      | name           | slug           | email                      | password | id   | termsAndConditionsAgreedVersion |
      | Chilly Chatter | chilly-chatter | chilly.chatter@example.org | 1234     | u_cc | 0.0.4                           |
      | Michi Mute     | michi-mute     | michi.mute@example.org     | 1234     | u_mm | 0.0.4                           |
      | Billy Block    | billy-block    | billy.block@example.org    | 1234     | u_bb | 0.0.4                           |
      | Anna Absent    | anna-absent    | anna.absent@example.org    | 1234     | u_aa | 0.0.4                           |
    And "Anna Absent" mutes "Michi Mute"
    And "Anna Absent" blocks "Billy Block"
    And the mailserver inbox is empty

  Scenario: Receive Chat Notification Email only when Online
    When I am logged in as "chilly-chatter"
    And I send a chat message to "Anna Absent"
    And I log out
    When I am logged in as "michi-mute"
    And I send a chat message to "Anna Absent"
    And I log out
    When I am logged in as "billy-block"
    And I send a chat message to "Anna Absent"
    And I log out
    Then "Anna Absent" should receive "1" chat notification email referencing "Chilly Chatter"
    When I am logged in as "anna-absent"
    # And "Chilly Chatter" sends a chat message to "Anna Absent"
    # And "Michi Mute" sends a chat message to "Anna Absent"
    # And "Billy Block" sends a chat message to "Anna Absent"
    # Then "anna.absent@example.org" should receive no chat notification email
  