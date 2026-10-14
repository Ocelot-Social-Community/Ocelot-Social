Feature: A group's long description
  As somebody looking at a group
  I want to read its whole description
  So that a long one is shortened, never cut off for good

  # #10488: on the first visit by a click from the group list the page mounted before the group
  # arrived, measured too early, and the "show more" button never appeared. Only a browser shows
  # that: tiptap attaches its content a tick after it renders.
  # #10487: without the fade, the shortened description must end below a whole line.

  Background:
    Given the following "users" are in the database:
      | slug   | email              | password | id     | name   | termsAndConditionsAgreedVersion |
      | owner  | owner@example.org  | 1234     | owner  | Olivia | 0.0.4                           |
      | reader | reader@example.org | 1234     | reader | Rita   | 0.0.4                           |
    And the following "groups" are in the database:
      | id         | name       | slug       | template | ownerId | about      | description                                               | actionRadius |
      | long-story | Long Story | long-story | public   | owner   | Many words | A public group whose description is replaced right below. | regional     |
      | short-note | Short Note | short-note | public   | owner   | Few words  | A public group whose description fits on two lines.       | regional     |
    And the group "long-story" has a description of 12 paragraphs ending in "The very last sentence."

  Scenario: Opened from the group list, a long description can be expanded
    Given I am logged in as "reader"
    When I navigate to page "/groups"
    And I open the group "Long Story" from the list of all groups
    Then the description offers "show more"
    And the shortened description ends below a whole line
    When I expand the description
    Then I see "The very last sentence." in the description
    And the description offers "show less"

  Scenario: Loaded directly, a long description can be expanded too
    Given I am logged in as "reader"
    When I navigate to page "/groups/long-story/long-story"
    Then the description offers "show more"
    And the shortened description ends below a whole line

  Scenario: A short description offers nothing to expand
    Given I am logged in as "reader"
    When I navigate to page "/groups/short-note/short-note"
    Then I see "fits on two lines" in the description
    And the description offers no toggle
