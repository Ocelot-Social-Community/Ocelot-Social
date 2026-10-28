Feature: Running video calls in the dock
  As a member of a group whose video call is running
  I want to see the call beside the feed and join it from there
  So that I notice a running call without visiting the group

  # LiveKit cannot run here (see README.md), so the list of running calls is stubbed: these
  # scenarios cover the dock in the real page — layout, drawer, joining. Who may see which call
  # is the backend's decision and tested there (videoCalls.activeCalls.spec.ts).

  Background:
    Given the following "users" are in the database:
      | slug  | email             | password | id    | name  | termsAndConditionsAgreedVersion |
      | alice | alice@example.org | 1234     | alice | Alice | 0.0.4                           |
    And the following "groups" are in the database:
      | id         | name       | slug       | ownerId | template | description                                                                                                         |
      | call-group | Call Group | call-group | alice   | public   | This is a public group for end-to-end testing of the dock that shows running video calls. It must be over 100 chars. |
    And the following "posts" are in the database:
      | id      | title        | slug         | authorId | content                        |
      | dock-p1 | A first post | a-first-post | alice    | Something to line the dock up. |
    And a video call is running in group "call-group" with "alice"
    And I am logged in as "alice"

  Scenario: On a wide screen the call stands beside the feed, level with the first post
    Given the screen is 1920 pixels wide
    When I navigate to page "/"
    Then the dock shows the running call beside the feed
    And the first call in the dock is level with the first post
    When I join the call from the dock
    Then I see the video-call pre-join dialog

  Scenario: On a small screen the call waits behind a flag
    Given the screen is 375 pixels wide
    When I navigate to page "/"
    Then the dock flag shows "1"
    When I open the dock
    Then the dock drawer stays open with the focus inside
    When I press Escape
    Then the dock drawer is closed and the flag has the focus
    When I open the dock
    And I join the call from the dock
    Then I see the video-call pre-join dialog
    And the dock drawer is closed

  Scenario: The calls show on the feed only, and only while one runs
    Given the screen is 1920 pixels wide
    When I navigate to page "/groups/call-group/call-group"
    Then I see no dock
    Given no video call is running
    When I navigate to page "/"
    Then I see no dock
