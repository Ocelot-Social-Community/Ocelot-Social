Feature: User authentication
  As an user 
  I want to sign in
  In order to be able to posts and do other contributions as myself
  Furthermore I want to be able to stay logged in and logout again

  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name      | slug      | termsAndConditionsAgreedVersion |
      | peterpan@example.org | 1234     | id-of-peter-pan | Peter Pan | peter-pan | 0.0.4                           |

  Scenario: Log in
    When I navigate to page "/login"
    And I fill in my credentials "peterpan@example.org" "1234"
    And I click on "submit button"
    Then I am logged in with username "Peter Pan"

  Scenario: Refresh and stay logged in
    Given I am logged in as "peter-pan"
    When I refresh the page
    Then I am logged in with username "Peter Pan"

  Scenario: Log out
    Given I am logged in as "peter-pan"
    When I navigate to page "/"
    And I log out
    Then I am on page "login"
