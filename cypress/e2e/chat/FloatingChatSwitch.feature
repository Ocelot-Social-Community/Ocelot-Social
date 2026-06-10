Feature: Floating Chat Switching
  As a user
  I want the floating chat window to switch to the correct conversation
  So that I can see the right chat when navigating between profiles

  Background:
    Given the following "users" are in the database:
      | slug    | email               | password | id      | name    | termsAndConditionsAgreedVersion |
      | alice   | alice@example.org   | 1234     | alice   | Alice   | 0.0.4                           |
      | bob     | bob@example.org     | 1234     | bob     | Bob     | 0.0.4                           |
      | charlie | charlie@example.org | 1234     | charlie | Charlie | 0.0.4                           |
    And the following "groups" are in the database:
      | id         | name       | slug       | ownerId | groupType | description                                                                                                         |
      | test-group | Test Group | test-group | alice   | public    | This is a test group for e2e testing of floating chat switching. It needs to be long enough to pass validation here. |

  Scenario: Switch floating chat from one user to another
    Given I am logged in as "alice"
    And I navigate to page "/profile/bob/bob"
    When I click on the user chat button
    Then I see the floating chat with name "Bob"
    When I navigate to page "/profile/charlie/charlie"
    And I click on the user chat button
    Then I see the floating chat with name "Charlie"

  Scenario: Switch floating chat from a user to a group
    Given "alice" is a member of group "test-group"
    And I am logged in as "alice"
    And I navigate to page "/profile/bob/bob"
    When I click on the user chat button
    Then I see the floating chat with name "Bob"
    When I navigate to page "/groups/test-group/test-group"
    And I click on the group chat button
    Then I see the floating chat with name "Test Group"

  Scenario: Switch floating chat from a group to a user
    Given "alice" is a member of group "test-group"
    And I am logged in as "alice"
    And I navigate to page "/groups/test-group/test-group"
    When I click on the group chat button
    Then I see the floating chat with name "Test Group"
    When I navigate to page "/profile/bob/bob"
    And I click on the user chat button
    Then I see the floating chat with name "Bob"
