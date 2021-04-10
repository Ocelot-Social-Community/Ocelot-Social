Feature: Authentication
  As an user 
  I want to sign in
  In order to be able to posts and do other contributions as myself
  Furthermore I want to be able to stay logged in and logout again

  Background:
    Given I have an user account

  Scenario: Log in
    When I visit the "login" page
    And I fill in my credentials
    And I click submit
    Then I am logged in as "Peter Pan"

  Scenario: Refresh and stay logged in
    Given I am logged in
    When I refresh the page
    Then I am logged in as "Peter Pan"

  Scenario: Log out
    Given I am logged in
    When I log out
    Then I am on page "login"
