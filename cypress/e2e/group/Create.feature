Feature: Create a group
  As an logged in user
  I would like to create a group
  To invite my friends

  Background:
    Given the following "users" are in the database:
      | slug     | email                | password | id             | name            | termsAndConditionsAgreedVersion |
      | narrator | narrator@example.org | 1234     | narrator       | Nathan Narrator | 0.0.4                           |
    And I am logged in as "narrator"
    And I navigate to page "/groups"

  Scenario: Create a group
    When I click on "create group button"
    Then I am on page "groups/create"
    When I choose "My group " as the name
    And I choose the "public" template
    And I choose "to invite my friends" as the about
    And I choose the following text as description:
      """
      This is the group where I want to exchange
      my views with my friends.
      """    
    And I choose "regional" as the action radius
    And I click on "save button"
    Then I am on page "/groups/.*/my-group"
    And the group was saved successfully
    When I navigate to page "/groups"
    Then I see the group "My group" in the group list

  Scenario: Edit the group's settings
    Given the following "groups" are in the database:
      | id      | name    | slug    | template | ownerId  | about        | description                                                         | actionRadius |
      | g-edit  | Old Name | old-name | public  | narrator | Before edits | A group whose settings are about to change, to see the change land. | regional     |
    When I navigate to page "/groups/edit/g-edit"
    And I change the group name to "New Name"
    And I click on "save button"
    Then I see a toaster with status "success"
    When I navigate to page "/groups/g-edit/old-name"
    Then the group page is titled "New Name"
