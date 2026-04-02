Feature: Notification for a mention
  As a user
  I want to be notified if somebody mentions me in a post or comment
  In order join conversations about or related to me

  Background:
    Given the following "users" are in the database:
      | slug              | email                | password | id       | name                 | termsAndConditionsAgreedVersion |
      | wolle-aus-hamburg | wolle@example.org    | 1234     | wolle    | Wolfgang aus Hamburg | 0.0.4                           |
      | matt-rider        | matt@example.org     | 4321     | matt     | Matt Rider           | 0.0.4                           |

  Scenario: Mention another user, re-login as this user and see notifications
    Given I am logged in as "wolle-aus-hamburg"
    And I navigate to page "/"
    And I navigate to page "/post/create"
    And I start to write a new post with the title "Hey Matt" beginning with:
      """
      Big shout to our fellow contributor
      """
    And mention "@matt-rider" in the text
    And I click on "save button"
    And I am logged in as "matt-rider"
    And I navigate to page "/"
    And see 1 unread notifications in the top menu
    And open the notification menu and click on the first item
    And I wait for 750 milliseconds
    Then I am on page "/post/.*/hey-matt"
    And the unread counter is removed
    And the notification menu button links to the all notifications page