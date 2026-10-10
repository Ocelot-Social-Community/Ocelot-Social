Feature: Join a group
  As a user who found a group
  I want to join it, or ask to where the group decides who comes in
  So that I can take part in it

  # Whether the button lets somebody in or only asks is decided by the group's rights — `group.join`
  # or `group.join.request` on its non-member role — not by its type. The fixtures below take both
  # from the templates: public lets people in, closed lets them ask.

  Background:
    Given the following "users" are in the database:
      | slug    | email               | password | id      | name    | termsAndConditionsAgreedVersion |
      | owner   | owner@example.org   | 1234     | owner   | Olivia  | 0.0.4                           |
      | visitor | visitor@example.org | 1234     | visitor | Vincent | 0.0.4                           |
    And the following "groups" are in the database:
      | id            | name          | slug          | template | ownerId | about             | description                                                    | actionRadius |
      | open-circle   | Open Circle   | open-circle   | public   | owner   | Everybody welcome | A public group anybody may walk into, to see the door open.   | regional     |
      | closed-circle | Closed Circle | closed-circle | closed   | owner   | By request        | A closed group whose owner decides, to see the request arrive. | regional     |

  Scenario: Join a public group straight away
    Given I am logged in as "visitor"
    When I navigate to page "/groups"
    And I open the group "Open Circle" from the list of all groups
    Then I am on page "/groups/open-circle/open-circle"
    And the join button says "Join"
    When I click the join button
    Then the join button says "I'm a member"

  Scenario: Ask to join a closed group, and the owner hears of it
    Given I am logged in as "visitor"
    When I navigate to page "/groups/closed-circle/closed-circle"
    Then the join button says "Ask to join"
    When I click the join button
    Then the join button says "Pending member"
    Given I am logged in as "owner"
    When I navigate to page "/notifications"
    Then I see the notification "Joined your group" from "Vincent"
