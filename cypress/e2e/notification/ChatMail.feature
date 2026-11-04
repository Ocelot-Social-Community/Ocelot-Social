Feature: Chat messages by e-mail while I am not online
  As a user
  I want to hear of a chat message by e-mail when I am not in the network
  — but not twice while I am, and never from somebody I muted
  In order to answer in time without being pestered

  Background:
    Given the following "users" are in the database:
      | slug    | email               | password | id      | name    | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org   | 1234     | alice   | Alice   | 0.0.4                           |
      | bob     | bob@example.org     | 1234     | bob     | Bob     | 0.0.4                           |
      | carla   | carla@example.org   | 1234     | carla   | Carla   | 0.0.4                           |
      | mallory | mallory@example.org | 1234     | mallory | Mallory | 0.0.4                           |
    And the mailbox is empty

  Scenario: A chat message to somebody not online arrives by e-mail
    When "alice" sends a chat message "Are you coming on Saturday?" to "bob"
    Then "bob" receives an e-mail "New chat message"

  Scenario: A chat message to somebody online arrives in the chat only
    Given I am logged in as "bob"
    And I am online on page "/"
    When "alice" sends a chat message "Are you coming on Saturday?" to "bob"
    And "alice" sends a chat message "Are you coming on Saturday?" to "carla"
    Then I see 1 unread chat message in the header
    And "carla" receives an e-mail "New chat message"
    And "bob" receives no e-mail

  Scenario: A muted user's chat message neither shows nor mails
    Given "bob" mutes "mallory"
    When "mallory" sends a chat message "Buy my miracle fertiliser" to "bob"
    And "alice" sends a chat message "Are you coming on Saturday?" to "bob"
    Then "bob" receives an e-mail "New chat message"
    And that e-mail names "Alice"
    When I am logged in as "bob"
    And I navigate to page "/"
    Then I see 1 unread chat message in the header
