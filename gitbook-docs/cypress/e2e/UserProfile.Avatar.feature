Feature: User profile - Upload avatar image
  As a user
  I would like to be able to add an avatar image to my profile
  So that I can personalize my profile
  
  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name      | slug      | termsAndConditionsAgreedVersion |
      | peterpan@example.org | 123      | id-of-peter-pan | Peter Pan | peter-pan | 0.0.4                           |
      | user@example.org     | 123      | user            | User      | user      | 0.0.4                           |
    And I am logged in as "peter-pan"

  Scenario: Change my UserProfile Image
    And I navigate to page "/profile/peter-pan"
    Then I should be able to change my profile picture

  Scenario: Unable to change another user's avatar
    Given I am logged in as "user"
    And I navigate to page "/profile/peter-pan"
    Then I cannot upload a picture