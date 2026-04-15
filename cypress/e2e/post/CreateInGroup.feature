Feature: Create a post in a group
  As a group member
  I want to create a post directly inside a group I belong to
  And switch the post type while keeping my draft and the group context

  Background:
    Given the following "users" are in the database:
      | slug | email           | password | id  | name | termsAndConditionsAgreedVersion |
      | bob  | bob@example.org | 1234     | bob | Bob  | 0.0.4                           |
    And the following "groups" are in the database:
      | id         | name       | slug       | ownerId | groupType | description                                                                                                          |
      | test-group | Test Group | test-group | bob     | public    | This is a test group used by the e2e tests for post creation. It needs to be long enough to pass validation.         |
    And "bob" is a member of group "test-group"
    And I am logged in as "bob"

  Scenario: Draft and group context survive a post-type switch, then save
    When I navigate to page "/post/create/article?groupId=test-group"
    Then the post-in selector shows "Test Group"
    When I choose "Group Post Draft" as the title
    And I choose the following text as content:
      """
      Draft body that must survive a post-type switch.
      """
    # The editor throttles input events by 300ms — wait for it to flush so
    # the content lands in formData before the remount triggered by the switch.
    And I wait for 400 milliseconds
    And I switch the post type to "event"
    Then the title input still contains "Group Post Draft"
    And the post-in selector shows "Test Group"
    When I switch the post type to "article"
    Then the title input still contains "Group Post Draft"
    And the post-in selector shows "Test Group"
    When I click on "save button"
    Then I am on page "/post/.*/group-post-draft"
    And the post was saved successfully
    When I navigate to page "/groups/test-group/test-group"
    Then I see the post "Group Post Draft" in the group feed
