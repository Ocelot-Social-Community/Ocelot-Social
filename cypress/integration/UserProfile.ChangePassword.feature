Feature: User profile - change password
  As a user
  I want to change my password in my settings
  For security, e.g. if I exposed my password by accident

  Login via email and password is a well-known authentication procedure and you
  can assure to the server that you are who you claim to be. Either if you
  exposed your password by acccident and you want to invalidate the exposed
  password or just out of an good habit, you want to change your password.

  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name      | slug      | termsAndConditionsAgreedVersion |
      | peterpan@example.org | exposed  | id-of-peter-pan | Peter Pan | peter-pan | 0.0.4                           |
    And I am logged in as "peter-pan"
    And I navigate to page "/settings"
    And I click on "security menu"

  Scenario: Incorrect Old Password
    When I fill the password form with:
      | Your old password    | incorrect |
      | Your new password    | secure    |
      | Confirm new password | secure    |
    And I submit the form
    And I see a "failure toaster" message:
    """
    Old password is not correct
    """

  Scenario: Incorrect Password Repeat
    When I fill the password form with:
      | Your old password    | exposed |
      | Your new password    | secure  |
      | Confirm new password | eruces  |
    And I cannot submit the form

  Scenario: Change my password
    Given I navigate to page "/settings" 
    And I click on "security menu"
    When I fill the password form with:
      | Your old password    | exposed |
      | Your new password    | secure  |
      | Confirm new password | secure  |
    And I submit the form
    And I see a "success toaster" message:
    """
    Password successfully changed!
    """
    And I log out
    Then I fill in my credentials "peterpan@example.org" "exposed"
    And I click on "submit button"
    And I cannot login anymore
    But I fill in my credentials "peterpan@example.org" "secure"
    And I click on "submit button"
    And I can login successfully
