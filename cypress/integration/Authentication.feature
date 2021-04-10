Feature: Authentication
  As an user 
  I want to sign in
  In order to be able to posts and do other contributions as myself

  Background:
    Given I have an user account

  Scenario: Log in
    When I visit the "login" page
    And I fill in my email and password combination
    And I click submit
    And I wait for 50000 milliseconds
    Then I can click on my profile picture in the top right corner
    And I wait for 50000 milliseconds
    And I can see my name "Peter Lustig" in the dropdown menu

  Scenario: Refresh and stay logged in
    Given I am logged in
    When I refresh the page
    Then I am still logged in

  Scenario: Log out
    Given I am logged in
    When I log out through the menu in the top right corner
    Then I see the login screen again
