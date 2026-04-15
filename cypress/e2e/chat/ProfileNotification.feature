Feature: Chat notification badge on profile pages
  As a user
  I want to see a notification badge on the chat button of user and group profile pages
  When there are unread messages for that conversation

  Background:
    Given the following "users" are in the database:
      | slug    | email              | password | id     | name  | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org  | 1234     | alice  | Alice | 0.0.4                           |
      | bob     | bob@example.org    | 4321     | bob    | Bob   | 0.0.4                           |
    And the following "groups" are in the database:
      | id         | name       | slug       | ownerId | groupType | description                                                                                                   |
      | test-group | Test Group | test-group | alice   | public    | This is a test group for e2e testing of the group chat feature. It needs to be long enough to pass validation. |

  Scenario: Receive chat notification live on a user profile
    Given I am logged in as "bob"
    And I navigate to page "/profile/alice/alice"
    And I see no unread chat messages on the profile
    When "alice" sends a chat message "Hello Bob!" to "bob"
    Then I see 1 unread chat message on the profile

  Scenario: Badge clears after reading the conversation
    Given "alice" sends a chat message "Hey Bob!" to "bob"
    And I am logged in as "bob"
    When I navigate to page "/profile/alice/alice"
    Then I see 1 unread chat message on the profile
    When I navigate to page "/chat"
    And I click on the room "Alice"
    And I see the message "Hey Bob!" in the chat
    And I navigate to page "/profile/alice/alice"
    Then I see no unread chat messages on the profile

  Scenario: Receive group chat notification live on a group profile
    Given "bob" is a member of group "test-group"
    And "alice" opens the group chat for "test-group"
    And I am logged in as "bob"
    And I navigate to page "/groups/test-group/test-group"
    And I see no unread chat messages on the profile
    When "alice" sends a group chat message "Hello everyone!" to "test-group"
    Then I see 1 unread chat message on the profile
