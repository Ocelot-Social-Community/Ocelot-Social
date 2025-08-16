Feature: Notifications regarding followed Users
  As a user
  I want to follow other users
  To get notified about them posting in the network

  When absent or offline I get notified via e-mail

  Background:
    Given the following "users" are in the database:
      | name               | slug               | email                 | password | id   |  termsAndConditionsAgreedVersion |
      | Bob der Baumeister | bob-der-baumeister | moderator@example.org | 1234     | u2   |  0.0.4                           |
      | Jenny Rostock      | jenny-rostock      | user@example.org      | 1234     | u3   |  0.0.4                           |
      | Peter Pan          | peter-pan          | peterpan@example.org  | 1234     | up   |  0.0.4                           |
    And "Bob der Baumeister" follows "Jenny Rostock"

  Scenario: Get notified about new public post from followed user
    Given "Jenny Rostock" creates a public post in the network
    Then "Bob der Baumeister" receives "1" email about a new public post from "Jenny Rostock"
    Then "Peter Pan" receives "0" email about a new public post from "Jenny Rostock"
    When I am logged in as "Bob der Baumeister"
    Then I see a notification about the new post in the dashboard
    When "Jenny Rostock" creates a public post in the network
    Then "Bob der Baumeister" receives "0" email about a new public post from "Jenny Rostock"