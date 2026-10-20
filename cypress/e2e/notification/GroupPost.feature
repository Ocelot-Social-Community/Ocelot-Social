Feature: Notification about a new post in my group
  As a member of a group
  I want to hear of new posts in it, by e-mail while I am not online
  In order to follow what the group is up to

  # Who is notified and who is not (muted group, blocked author, pending member, …) is the
  # backend's notificationsMiddleware specs' business. These scenarios cover the way there: the
  # real mutation, the mail as maildev receives it, and where its link leads.

  Background:
    Given the following "users" are in the database:
      | slug  | email             | password | id    | name  | locale | termsAndConditionsAgreedVersion |
      | alice | alice@example.org | 1234     | alice | Alice | en     | 0.0.4                           |
      | bob   | bob@example.org   | 1234     | bob   | Bob   | en     | 0.0.4                           |
      | carla | carla@example.org | 1234     | carla | Carla | de     | 0.0.4                           |
    And the following "groups" are in the database:
      | id            | name          | slug          | template | ownerId | about        | description                                                      | actionRadius |
      | garden-circle | Garden Circle | garden-circle | closed   | alice   | We dig it    | A closed group of gardeners, to see its members hear of its news. | regional     |
    And "bob" is a member of group "garden-circle"
    And "carla" is a member of group "garden-circle"
    And the mailbox is empty

  Scenario: A member who is not online gets an e-mail, and its link leads to the post
    When "alice" posts "Garden day on Saturday" in the group "garden-circle"
    Then "bob" receives an e-mail "New post in group"
    And "alice" receives no e-mail
    When I am logged in as "bob"
    And I navigate to page "/"
    And see 1 unread notifications in the top menu
    And I follow the link "View post" in that e-mail
    Then I am on page "/post/.*/garden-day-on-saturday"
    And the unread counter is removed

  Scenario: The e-mail speaks the language of its recipient
    When "alice" posts "Garden day on Saturday" in the group "garden-circle"
    Then "carla" receives an e-mail "Neuer Beitrag in Gruppe"
    And "bob" receives an e-mail "New post in group"
