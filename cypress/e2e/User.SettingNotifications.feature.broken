Feature: User sets donations info settings
  As a user
  I want to change my notifications settings
  In order to manage the notifications

  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name      | slug      | termsAndConditionsAgreedVersion |
      | peterpan@example.org | 123      | id-of-peter-pan | Peter Pan | peter-pan | 0.0.4                           |
      | user@example.org     | 123      | user            | User      | user      | 0.0.4                           |
    And I am logged in as "peter-pan"

  Scenario: The notifications setting "Send e-mail notifications" is set to true by default and can be set to false
    # When I navigate to my "Notifications" settings page
    When I navigate to page "/settings/notifications"
    Then the checkbox with ID "send-email" should "be.checked"
    And I click on element with ID "send-email"
    And the checkbox with ID "send-email" should "not.be.checked"
    Then I click save
    And I see a toaster with "Notifications settings saved!"
