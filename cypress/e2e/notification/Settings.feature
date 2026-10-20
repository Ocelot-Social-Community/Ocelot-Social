Feature: Choose which notifications reach me by e-mail
  As a user
  I want to switch off the e-mails of one kind of notification
  In order to keep getting the others

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

  Scenario: E-mails about group posts switched off, chat e-mails still on
    Given I am logged in as "bob"
    And I navigate to page "/settings/notifications"
    When I switch off the e-mails for "Post in a group I am a member of."
    And I save the notification settings
    Then I see a toaster with "Notifications settings saved!"
    # Having just used the settings page, bob counts as online for a while: no mail at all.
    Given I log out
    And I am on page "/login"
    And "bob" has not been active for a while
    When "alice" posts "Garden day on Saturday" in the group "garden-circle"
    And "alice" sends a chat message "See you on Saturday?" to "bob"
    Then "bob" receives an e-mail "New chat message"
    And "carla" receives an e-mail "New post in group"
    And "bob" receives no e-mail "New post in group"
