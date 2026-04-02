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
    And I choose "public" as the visibility
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
