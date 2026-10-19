Feature: No e-mail while I am online
  As a user who has the network open
  I want to hear of news in the network itself, not by e-mail as well
  In order to get e-mails only about what I would otherwise miss

  # Online is what the webapp reports while a page is open (plugins/onlineStatus.js), not a
  # mocked flag as in the backend specs: this is where the two are seen to agree.

  Background:
    Given the following "users" are in the database:
      | slug  | email             | password | id    | name  | termsAndConditionsAgreedVersion |
      | alice | alice@example.org | 1234     | alice | Alice | 0.0.4                           |
      | bob   | bob@example.org   | 1234     | bob   | Bob   | 0.0.4                           |
      | carla | carla@example.org | 1234     | carla | Carla | 0.0.4                           |
    And the following "groups" are in the database:
      | id            | name          | slug          | template | ownerId | about     | description                                                      | actionRadius |
      | garden-circle | Garden Circle | garden-circle | closed   | alice   | We dig it | A closed group of gardeners, to see its members hear of its news. | regional     |
    And "bob" is a member of group "garden-circle"
    And "carla" is a member of group "garden-circle"
    And the mailbox is empty

  Scenario: Who is online sees the notification arrive, who is not gets an e-mail
    Given I am logged in as "bob"
    And I am online on page "/"
    When "alice" posts "Garden day on Saturday" in the group "garden-circle"
    Then "carla" receives an e-mail "New post in group"
    And "bob" receives no e-mail
    And see 1 unread notifications in the top menu
