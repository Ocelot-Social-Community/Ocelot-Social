Feature: Group Chat
  As a group member
  I want to chat with other group members in a group chat
  So that we can communicate within the group

  Background:
    Given the following "users" are in the database:
      | slug    | email              | password | id     | name          | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org  | 1234     | alice  | Alice         | 0.0.4                          |
      | bob     | bob@example.org    | 4321     | bob    | Bob           | 0.0.4                          |
      | carol   | carol@example.org  | 1234     | carol  | Carol         | 0.0.4                          |
    And the following "groups" are in the database:
      | id          | name         | slug         | ownerId | groupType | description                                                                                                       |
      | test-group  | Test Group   | test-group   | alice   | public    | This is a test group for e2e testing of the group chat feature. It needs to be long enough to pass validation.     |

  Scenario: Open group chat from group profile
    Given "bob" is a member of group "test-group"
    And I am logged in as "bob"
    And I navigate to page "/groups/test-group/test-group"
    When I click on the group chat button
    Then I see the group chat popup with name "Test Group"

  Scenario: Send a message in the group chat
    Given "bob" is a member of group "test-group"
    And I am logged in as "bob"
    And I navigate to page "/chat"
    When I open the group chat for "test-group"
    And I send the message "Hello Group!" in the chat
    Then I see the message "Hello Group!" in the chat

  Scenario: Receive a group chat notification
    Given "bob" is a member of group "test-group"
    And "alice" opens the group chat for "test-group"
    And I am logged in as "bob"
    And I navigate to page "/"
    And I see no unread chat messages in the header
    When "alice" sends a group chat message "Hello everyone!" to "test-group"
    Then I see 1 unread chat message in the header
