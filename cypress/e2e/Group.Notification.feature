Feature: Notifications for Groups
  As a member of a group
  I want to receive notifications about new posts in the group by default
  To stay informed about the group's activity

  When absent or offline I get notified via e-mail
  For users I have blocked or muted no notifications or emails are send

  Background:
    Given the following "users" are in the database:
      | name               | slug               | email                 | password | id   |  termsAndConditionsAgreedVersion |
      | Bob der Baumeister | bob-der-baumeister | moderator@example.org | 1234     | u2   |  0.0.4                           |
      | Jenny Rostock      | jenny-rostock      | user@example.org      | 1234     | u3   |  0.0.4                           |
      | Nathan Narrator    | nathan-narrator    | narrator@example.org  | abcd     | u_nn |  0.0.4                           |
      | Billy Block        | billy-block        | billy@example.org     | 4321     | u_bb |  0.0.4                           |
    And "Bob der Baumeister" mutes "Nathan Narrator"
    And "Bob der Baumeister" blocks "Billy Block"
    Given "Bob der Baumeister" creates the group "Bob's Group"
    And "Jenny Rostock" joins the group "Bob's Group"
    And "Nathan Narrator" joins the group "Bob's Group"
    Given "Jenny Rostock" creates the group "Jenny's Group"    
    And "Bob der Baumeister" joins the group "Jenny's Group"
    And "Billy Block" joins the group "Jenny's Group"

  Scenario: In-app notification
    Given "Bob der Baumeister" posts to group "Jenny's Group"
    When I am logged in as "Jenny Rostock"
    Then I see a notification about the new post in the dashboard

  Scenario: Email notification
    Given "Bob der Baumeister" posts to group "Jenny's Group"
    Then "Jenny Rostock" receives an email about a new post in group "Jenny's Group"
    And the email contains a deep link to the post

  Scenario: No notification from muted group
    Given "Jenny Rostock"  has muted group "Bob's Group"
    And "Bob der Baumeister" posts to group "Bob's Group"
    When I am logged in as "Jenny Rostock"
    Then I don't see a notification in the dashboard
    And I don't receive any email regarding "Bob's Group"

  Scenario: Never get notifications for own posts
    Given I am logged in as "Jenny Rostock"
    When I write a post in group "Jenny's Group"
    Then I don't see a notification in the dashboard
    And I don't receive an email either