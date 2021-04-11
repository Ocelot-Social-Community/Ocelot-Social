Feature: User profile - list social media accounts
  As a User
  I'd like to enter my social media
  So I can show them to other users to get in contact

  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name      | slug      | termsAndConditionsAgreedVersion |
      | peterpan@example.org | 123      | id-of-peter-pan | Peter Pan | peter-pan | 0.0.4                           |
    And I am logged in as "peter-pan"

  Scenario: Adding Social Media
    When I navigate to page "/settings/my-social-media"
    Then I am on page "/settings/my-social-media"
    When I add a social media link
    Then I see a toaster with "Added social media"
    And the new social media link shows up on the page

  Scenario: Other users viewing my Social Media
    Given I have added a social media link
    When I navigate to page "/profile/peter-pan"
    Then they should be able to see my social media links

  Scenario: Deleting Social Media
    When I navigate to page "/settings/my-social-media"
    Then I am on page "/settings/my-social-media"
    Given I have added a social media link
    When I delete a social media link
    Then I see a toaster with "Deleted social media"

  Scenario: Editing Social Media
    When I navigate to page "/settings/my-social-media"
    Then I am on page "/settings/my-social-media"
    Given I have added a social media link
    When I start editing a social media link
    Then I can cancel editing
    When I start editing a social media link
    And I edit and save the link
    Then I see a toaster with "Added social media"
    And the new url is displayed
    But the old url is not displayed
